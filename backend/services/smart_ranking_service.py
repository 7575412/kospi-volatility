from datetime import datetime, timedelta
from typing import Optional
from pykrx import stock
import pandas as pd
from services.analysis_service import (
    compute_indicators, _load_disk, _save_disk, _date_str,
    _last_business_day, _to_business_day, get_cache,
)


def _volume_ratio(df: pd.DataFrame) -> float:
    vol = df["거래량"].astype(float)
    vol_ma20 = vol.rolling(20).mean()
    last_vol = float(vol.iloc[-1])
    last_avg = float(vol_ma20.iloc[-1])
    if last_avg <= 0 or pd.isna(last_avg):
        return 1.0
    return round(last_vol / last_avg, 2)


def _per_score(per: float) -> float:
    if per < 8:  return 100.0
    if per < 15: return 70.0
    if per < 20: return 50.0
    if per < 30: return 30.0
    return 10.0


def _composite_score(rank_in_candidates: int, total: int,
                     tech_score: int, per: float, vol_ratio: float) -> float:
    trv   = (1 - rank_in_candidates / max(total, 1)) * 100
    tech  = ((tech_score or 0) + 5) / 10 * 100
    per_s = _per_score(per)
    vol_s = min(vol_ratio / 3.0, 1.0) * 100
    return round(0.20 * trv + 0.40 * tech + 0.20 * per_s + 0.20 * vol_s, 2)


def _ma_trend(cur: dict) -> str:
    ma5, ma20, ma60 = cur.get("ma5"), cur.get("ma20"), cur.get("ma60")
    if ma5 and ma20 and ma60:
        if ma5 > ma20 > ma60: return "bullish"
        if ma5 < ma20 < ma60: return "bearish"
    return "neutral"


def _fmt_trv(v: int) -> str:
    if v >= 10**12: return f"{v/10**12:.1f}조"
    if v >= 10**8:  return f"{round(v/10**8)}억"
    return f"{round(v/10**4)}만"


def _pick_best_buy(ranked: list) -> Optional[dict]:
    for s in ranked:
        if s["recommendation"] in ("강매수", "매수"):
            parts = []
            if s.get("rsi") and s["rsi"] < 45:
                parts.append(f"RSI {s['rsi']:.0f} 저점")
            parts.append(f"거래대금 {_fmt_trv(s['trading_value'])}")
            if s.get("per"):
                parts.append(f"PER {s['per']:.1f}")
            if s.get("volume_ratio") and s["volume_ratio"] > 1.5:
                parts.append(f"거래량 {s['volume_ratio']:.1f}배 급증")
            return {**s, "reason": " · ".join(parts) if parts else "복합 기술지표 매수 신호"}
    return {**ranked[0], "reason": "복합 점수 1위"} if ranked else None


def _sell_score(s: dict) -> int:
    score = 0
    if s.get("rsi") and s["rsi"] > 65:          score += 2
    if s.get("recommendation") in ("매도", "강매도"): score += 2
    if s.get("ma_trend") == "bearish":           score += 1
    if s.get("per") and s["per"] > 25:           score += 1
    return score


def _pick_best_sell(all_results: list) -> Optional[dict]:
    if not all_results:
        return None
    candidates = [s for s in all_results if _sell_score(s) >= 2] or all_results
    best = max(candidates, key=_sell_score)
    parts = []
    if best.get("rsi") and best["rsi"] > 65:
        parts.append(f"RSI {best['rsi']:.0f} 과매수")
    if best.get("ma_trend") == "bearish":
        parts.append("MA 하락배열")
    if best.get("per") and best["per"] > 25:
        parts.append(f"PER {best['per']:.1f} 고평가")
    return {**best, "reason": " · ".join(parts) if parts else "복합 기술지표 매도 신호",
            "sell_score": _sell_score(best)}


def compute_smart_ranking(launch_time: Optional[str] = None) -> dict:
    if launch_time:
        end_dt = _to_business_day(datetime.strptime(launch_time, "%Y%m%d"))
    else:
        end_dt = _last_business_day()

    end_str   = _date_str(end_dt)
    cache_key = f"smart_{end_str}"
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

    # Step 1: Bulk snapshot (2 API calls for entire KOSPI)
    df_ohlcv = stock.get_market_ohlcv_by_ticker(end_str, market="KOSPI")
    df_fund  = stock.get_market_fundamental_by_ticker(end_str, market="KOSPI")

    # Ensure 거래대금 exists; compute from 종가×거래량 if missing
    if "거래대금" not in df_ohlcv.columns:
        df_ohlcv["거래대금"] = df_ohlcv["종가"] * df_ohlcv["거래량"]

    merged = df_ohlcv.join(df_fund, how="left")

    # Step 2: Filter candidates
    mask = (merged["거래대금"] > 0) & (merged["종가"] >= 1000)
    if "PER" in merged.columns:
        mask &= (merged["PER"] > 0) & (merged["PER"] < 100)
    candidates = merged[mask].nlargest(80, "거래대금")

    # Step 3: Individual OHLCV + technical score per candidate
    start_str = _date_str(end_dt - timedelta(days=130))
    results   = []

    for idx, (ticker_code, row) in enumerate(candidates.iterrows()):
        try:
            df = stock.get_market_ohlcv_by_date(start_str, end_str, ticker_code)
            if df is None or len(df) < 20:
                continue

            ind  = compute_indicators(df, currency="KRW")
            cur  = ind["current"]
            vr   = _volume_ratio(df)
            per  = float(row["PER"]) if "PER" in row.index and pd.notna(row["PER"]) else 15.0
            eps  = int(row["EPS"])   if "EPS" in row.index and pd.notna(row["EPS"]) else 0
            trv  = int(row["거래대금"])
            r1d  = round(float(row["등락률"]), 2) if "등락률" in row.index else 0.0

            score = _composite_score(idx, len(candidates), cur["score"], per, vr)

            results.append({
                "ticker":          ticker_code,
                "name":            stock.get_market_ticker_name(ticker_code),
                "current_price":   int(row["종가"]),
                "trading_value":   trv,
                "return_1d":       r1d,
                "per":             round(per, 2),
                "eps":             eps,
                "recommendation":  cur["recommendation"],
                "rsi":             cur["rsi"],
                "volume_ratio":    vr,
                "ma_trend":        _ma_trend(cur),
                "composite_score": score,
                "tech_score":      cur["score"],
            })
        except Exception:
            continue

    if not results:
        raise ValueError("스마트 랭킹 계산 실패: 분석 가능한 종목 없음")

    # Step 4: Rank top 15 + pick best buy/sell
    ranked = sorted(results, key=lambda x: x["composite_score"], reverse=True)[:15]
    for i, s in enumerate(ranked, 1):
        s["rank"] = i

    out = {
        "as_of_date": end_str,
        "stocks":     ranked,
        "best_buy":   _pick_best_buy(ranked),
        "best_sell":  _pick_best_sell(results),
        "cached":     False,
    }
    mem_cache[cache_key] = out
    _save_disk(cache_key, out)
    return out
