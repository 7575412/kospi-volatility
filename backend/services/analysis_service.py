import json
import time
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from pykrx import stock
from core.cache import get_cache

DISK_CACHE_PATH = Path(__file__).parent.parent / "cache"


def _date_str(dt: datetime) -> str:
    return dt.strftime("%Y%m%d")


def _last_business_day() -> datetime:
    today = datetime.today()
    if today.weekday() == 5:
        return today - timedelta(days=1)
    if today.weekday() == 6:
        return today - timedelta(days=2)
    return today


def _to_business_day(dt: datetime) -> datetime:
    if dt.weekday() == 5:
        return dt - timedelta(days=1)
    if dt.weekday() == 6:
        return dt - timedelta(days=2)
    return dt


def _disk_path(key: str) -> Path:
    DISK_CACHE_PATH.mkdir(exist_ok=True)
    return DISK_CACHE_PATH / f"{key}.json"


def _load_disk(key: str, max_age_seconds: Optional[int] = 1800) -> Optional[dict]:
    p = _disk_path(key)
    if p.exists():
        try:
            data = json.loads(p.read_text())
            if max_age_seconds is not None:
                cached_at = data.get("disk_cached_at")
                if cached_at is None or (time.time() - cached_at) > max_age_seconds:
                    return None
            data.pop("disk_cached_at", None)
            return data
        except Exception:
            pass
    return None


def _save_disk(key: str, result: dict) -> None:
    try:
        _disk_path(key).write_text(
            json.dumps({**result, "disk_cached_at": time.time()}, ensure_ascii=False)
        )
    except Exception:
        pass


def compute_indicators(df: pd.DataFrame, currency: str = "KRW", eps: float = 0.0, per: float = 0.0) -> dict:
    """
    Compute technical indicators from OHLCV DataFrame.
    Requires columns: 종가, 거래량 (common to both pykrx and yfinance after rename).
    Returns indicators, signals, ohlcv, and price_targets.
    """
    close = df["종가"].astype(float)
    volume = df["거래량"].astype(float)

    # Moving averages
    ma5  = close.rolling(5).mean()
    ma20 = close.rolling(20).mean()
    ma60 = close.rolling(60).mean()
    vol_ma20 = volume.rolling(20).mean()

    # RSI-14 (Wilder's EMA, alpha = 1/14)
    delta    = close.diff()
    gain     = delta.clip(lower=0)
    loss     = (-delta.clip(upper=0))
    avg_gain = gain.ewm(alpha=1/14, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/14, adjust=False).mean()
    rs  = avg_gain / avg_loss.replace(0, np.nan)
    rsi = (100 - 100 / (1 + rs)).fillna(50)

    # MACD (12, 26, 9)
    ema12       = close.ewm(span=12, adjust=False).mean()
    ema26       = close.ewm(span=26, adjust=False).mean()
    macd        = ema12 - ema26
    macd_signal = macd.ewm(span=9, adjust=False).mean()

    # Bollinger Bands (20, 2σ)
    bb_mid = close.rolling(20).mean()
    bb_std = close.rolling(20).std()
    bb_upper = bb_mid + 2 * bb_std
    bb_lower = bb_mid - 2 * bb_std
    bb_range = (bb_upper - bb_lower).replace(0, np.nan)
    bb_pct   = ((close - bb_lower) / bb_range).fillna(0.5).clip(0, 1)

    ref_price = float(close.iloc[-1])
    if eps > 0 and per > 0:
        buy_target  = eps * (per * 0.85)
        sell_target = eps * (per * 1.15)
    else:
        buy_target  = ref_price * 0.90
        sell_target = ref_price * 1.10

    # ── Signal vectors (vectorised crossovers) ────────────────────────────
    gc_5_20  = (ma5 > ma20)  & (ma5.shift(1)  <= ma20.shift(1))   # MA5×MA20 골든크로스
    dc_5_20  = (ma5 < ma20)  & (ma5.shift(1)  >= ma20.shift(1))   # 데스크로스
    gc_20_60 = (ma20 > ma60) & (ma20.shift(1) <= ma60.shift(1))
    dc_20_60 = (ma20 < ma60) & (ma20.shift(1) >= ma60.shift(1))

    rsi_ob = rsi > 70   # 과매수
    rsi_os = rsi < 30   # 과매도

    macd_gc = (macd > macd_signal) & (macd.shift(1) <= macd_signal.shift(1))
    macd_dc = (macd < macd_signal) & (macd.shift(1) >= macd_signal.shift(1))

    bb_bot = bb_pct < 0.05   # 하단 이탈
    bb_top = bb_pct > 0.95   # 상단 이탈

    price_buy  = close <= buy_target    # -10% 달성
    price_sell = close >= sell_target   # +10% 달성

    # ── Build signal list ─────────────────────────────────────────────────
    dates = df.index
    signals = []

    for i in range(1, len(df)):
        score    = 0
        triggers = []

        if gc_5_20.iloc[i]:  score += 1; triggers.append("MA5×MA20골든크로스")
        if dc_5_20.iloc[i]:  score -= 1; triggers.append("MA5×MA20데스크로스")
        if gc_20_60.iloc[i]: score += 1; triggers.append("MA20×MA60골든크로스")
        if dc_20_60.iloc[i]: score -= 1; triggers.append("MA20×MA60데스크로스")
        if rsi_os.iloc[i]:   score += 1; triggers.append("RSI과매도")
        if rsi_ob.iloc[i]:   score -= 1; triggers.append("RSI과매수")
        if macd_gc.iloc[i]:  score += 1; triggers.append("MACD골든크로스")
        if macd_dc.iloc[i]:  score -= 1; triggers.append("MACD데스크로스")
        if bb_bot.iloc[i]:   score += 1; triggers.append("BB하단이탈")
        if bb_top.iloc[i]:   score -= 1; triggers.append("BB상단이탈")
        if price_buy.iloc[i]:  score += 1; triggers.append("매수목표가달성")
        if price_sell.iloc[i]: score -= 1; triggers.append("매도목표가달성")

        if not triggers:
            continue

        if score >= 3:    sig_type = "강매수"
        elif score >= 1:  sig_type = "매수"
        elif score <= -3: sig_type = "강매도"
        elif score <= -1: sig_type = "매도"
        else:             sig_type = "중립"

        price_val = round(float(close.iloc[i]), 2)
        signals.append({
            "date":     dates[i].strftime("%Y%m%d"),
            "price":    price_val,
            "type":     sig_type,
            "score":    int(score),
            "triggers": triggers,
        })

    signals.sort(key=lambda x: x["date"], reverse=True)

    # ── Current state ─────────────────────────────────────────────────────
    def _val(series):
        v = series.iloc[-1]
        return None if pd.isna(v) else round(float(v), 2)

    cur_rsi         = _val(rsi)
    cur_macd        = _val(macd)
    cur_macd_signal = _val(macd_signal)
    cur_bb_pct      = _val(bb_pct)
    cur_ma5         = _val(ma5)
    cur_ma20        = _val(ma20)
    cur_ma60        = _val(ma60)

    cur_score = 0
    if cur_rsi is not None:
        if cur_rsi < 30: cur_score += 1
        elif cur_rsi > 70: cur_score -= 1
    if cur_macd is not None and cur_macd_signal is not None:
        cur_score += 1 if cur_macd > cur_macd_signal else -1
    if cur_bb_pct is not None:
        if cur_bb_pct < 0.2: cur_score += 1
        elif cur_bb_pct > 0.8: cur_score -= 1
    if cur_ma5 and cur_ma20:
        cur_score += 1 if cur_ma5 > cur_ma20 else -1

    if cur_score >= 3:    rec = "강매수"
    elif cur_score >= 1:  rec = "매수"
    elif cur_score <= -3: rec = "강매도"
    elif cur_score <= -1: rec = "매도"
    else:                 rec = "중립"

    # ── OHLCV (last 60 entries for display) ──────────────────────────────
    has_open = "시가" in df.columns
    ohlcv = []
    for i in range(max(0, len(df) - 60), len(df)):
        row = df.iloc[i]
        ohlcv.append({
            "date":   dates[i].strftime("%Y%m%d"),
            "open":   round(float(row["시가"]) if has_open else float(row["종가"]), 2),
            "high":   round(float(row["고가"]) if "고가" in df.columns else float(row["종가"]), 2),
            "low":    round(float(row["저가"]) if "저가" in df.columns else float(row["종가"]), 2),
            "close":  round(float(row["종가"]), 2),
            "volume": int(row["거래량"]),
        })

    round2 = lambda v: round(v, 0 if currency == "KRW" else 2)

    buy_pct  = round((buy_target  / ref_price - 1) * 100, 1) if ref_price > 0 else -10.0
    sell_pct = round((sell_target / ref_price - 1) * 100, 1) if ref_price > 0 else  10.0

    return {
        "price_targets": {
            "ref_price":   round2(ref_price),
            "buy_target":  round2(buy_target),
            "sell_target": round2(sell_target),
            "buy_pct":     buy_pct,
            "sell_pct":    sell_pct,
        },
        "current": {
            "rsi":            cur_rsi,
            "macd":           cur_macd,
            "macd_signal":    cur_macd_signal,
            "bb_pct":         cur_bb_pct,
            "ma5":            cur_ma5,
            "ma20":           cur_ma20,
            "ma60":           cur_ma60,
            "recommendation": rec,
            "score":          cur_score,
        },
        "signals": signals,
        "ohlcv":   ohlcv,
    }


def compute_kr_analysis(ticker: str, launch_time: Optional[str] = None) -> dict:
    if launch_time:
        end_dt = _to_business_day(datetime.strptime(launch_time, "%Y%m%d"))
    else:
        end_dt = _last_business_day()

    end_str   = _date_str(end_dt)
    start_dt  = end_dt - timedelta(days=360)
    start_str = _date_str(start_dt)

    cache_key = f"kr_analysis_{ticker}_{end_str}"
    mem_cache = get_cache()

    if cache_key in mem_cache:
        result = dict(mem_cache[cache_key])
        result["cached"] = True
        return result

    disk = _load_disk(cache_key)
    if disk:
        mem_cache[cache_key] = disk
        disk = dict(disk)
        disk["cached"] = True
        return disk

    name = stock.get_market_ticker_name(ticker)
    df   = stock.get_market_ohlcv_by_date(start_str, end_str, ticker)

    if df is None or len(df) < 30:
        raise ValueError(f"데이터 부족: {ticker} (최소 30거래일 필요)")

    eps, per = 0.0, 0.0
    try:
        df_fund = stock.get_market_fundamental_by_ticker(end_str, market="KOSPI")
        if ticker in df_fund.index:
            row_f = df_fund.loc[ticker]
            if "EPS" in df_fund.columns and pd.notna(row_f["EPS"]) and float(row_f["EPS"]) > 0:
                eps = float(row_f["EPS"])
            if "PER" in df_fund.columns and pd.notna(row_f["PER"]) and float(row_f["PER"]) > 0:
                per = float(row_f["PER"])
    except Exception:
        pass

    indicators = compute_indicators(df, currency="KRW", eps=eps, per=per)

    result = {
        "ticker":        ticker,
        "name":          name,
        "as_of_date":    end_str,
        "current_price": int(df["종가"].iloc[-1]),
        "currency":      "KRW",
        "cached":        False,
        **indicators,
    }

    mem_cache[cache_key] = result
    _save_disk(cache_key, result)
    return result


def search_kr_tickers(query: str) -> list:
    """Search KOSPI+KOSDAQ tickers by company name substring."""
    import requests
    from io import StringIO
    try:
        resp = requests.get(
            "http://kind.krx.co.kr/corpgeneral/corpList.do",
            params={"method": "download", "searchType": "13"},
            headers={"User-Agent": "Mozilla/5.0", "Referer": "http://kind.krx.co.kr/"},
            timeout=15,
        )
        import pandas as pd
        df = pd.read_html(StringIO(resp.text), encoding="euc-kr")[0]
        df["코드"] = df["종목코드"].astype(str).str.zfill(6)
        matched = df[df["회사명"].str.contains(query, na=False)]
        return [
            {"ticker": row["코드"], "name": row["회사명"], "market": row.get("시장구분", "")}
            for _, row in matched.iterrows()
        ]
    except Exception:
        return []
