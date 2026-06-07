from datetime import datetime, timedelta
from typing import Optional
import pandas as pd
from pykrx import stock as pykrx_stock
from services.analysis_service import (
    _date_str, _last_business_day, _to_business_day,
    _load_disk, _save_disk, compute_kr_analysis, compute_indicators, get_cache,
)

SECTOR_US_PEERS: dict[str, list[tuple[str, str]]] = {
    "반도체와반도체장비":   [("NVDA","NVIDIA"),("TSM","Taiwan Semiconductor"),("INTC","Intel")],
    "반도체장비":          [("AMAT","Applied Materials"),("LRCX","Lam Research"),("KLAC","KLA Corp")],
    "자동차와부품":         [("TSLA","Tesla"),("GM","General Motors"),("F","Ford")],
    "가스유틸리티":         [("UGI","UGI Corp"),("NJR","NJ Resources"),("SR","Spire Inc")],
    "에너지장비및서비스":   [("XOM","ExxonMobil"),("CVX","Chevron"),("COP","ConocoPhillips")],
    "석유가스및소모성연료": [("XOM","ExxonMobil"),("CVX","Chevron"),("OXY","Occidental")],
    "철강":                [("NUE","Nucor"),("X","US Steel"),("STLD","Steel Dynamics")],
    "금속과광업":           [("FCX","Freeport-McMoRan"),("NEM","Newmont"),("VALE","Vale")],
    "은행":                [("JPM","JPMorgan Chase"),("BAC","Bank of America"),("WFC","Wells Fargo")],
    "보험":                [("BRK-B","Berkshire B"),("MET","MetLife"),("PRU","Prudential")],
    "소프트웨어":           [("MSFT","Microsoft"),("ORCL","Oracle"),("SAP","SAP")],
    "IT서비스":             [("ACN","Accenture"),("IBM","IBM"),("INFY","Infosys")],
    "바이오테크놀로지":     [("AMGN","Amgen"),("GILD","Gilead"),("REGN","Regeneron")],
    "제약":                [("JNJ","Johnson & Johnson"),("PFE","Pfizer"),("MRK","Merck")],
    "화학":                [("DOW","Dow Inc"),("LYB","LyondellBasell"),("EMN","Eastman")],
    "통신서비스":           [("T","AT&T"),("VZ","Verizon"),("TMUS","T-Mobile")],
    "건설":                [("DHI","D.R. Horton"),("LEN","Lennar"),("PHM","PulteGroup")],
    "해운":                [("ZIM","ZIM Integrated"),("MATX","Matson"),("SBLK","Star Bulk")],
    "항공우주와국방":       [("LMT","Lockheed Martin"),("RTX","RTX Corp"),("BA","Boeing")],
    "전자제품":             [("AAPL","Apple"),("SONY","Sony"),("HPQ","HP Inc")],
    "디스플레이패널":       [("OLED","Universal Display"),("KLIC","Kulicke & Soffa"),("AMBA","Ambarella")],
    "음식료품":             [("KO","Coca-Cola"),("PEP","PepsiCo"),("MCD","McDonald's")],
    "의류":                [("NKE","Nike"),("VFC","VF Corp"),("PVH","PVH Corp")],
    "유통업":               [("WMT","Walmart"),("TGT","Target"),("AMZN","Amazon")],
    "미디어와엔터테인먼트": [("DIS","Disney"),("NFLX","Netflix"),("PARA","Paramount")],
    "게임":                [("EA","Electronic Arts"),("TTWO","Take-Two"),("RBLX","Roblox")],
    "전력":                [("NEE","NextEra Energy"),("DUK","Duke Energy"),("SO","Southern Co")],
    "부동산":               [("AMT","American Tower"),("PLD","Prologis"),("EQIX","Equinix")],
    "운수창고":             [("UPS","UPS"),("FDX","FedEx"),("DAL","Delta Air Lines")],
    "_default":             [("SPY","S&P 500 ETF"),("QQQ","NASDAQ ETF"),("VTI","Total Market ETF")],
}


def _quick_us_snapshot(symbol: str) -> dict:
    import yfinance as yf
    end   = datetime.today()
    start = end - timedelta(days=130)
    df = yf.download(
        symbol,
        start=start.strftime("%Y-%m-%d"),
        end=end.strftime("%Y-%m-%d"),
        progress=False,
        auto_adjust=True,
    )
    if df.empty or len(df) < 14:
        return {"current_price": 0.0, "recommendation": "중립", "rsi": None,
                "return_3m": None, "buy_target": 0.0, "sell_target": 0.0}

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    if hasattr(df.index, "tz") and df.index.tz is not None:
        df.index = df.index.tz_convert(None)

    df = df.rename(columns={"Open": "시가", "High": "고가", "Low": "저가", "Close": "종가", "Volume": "거래량"})
    df = df[["시가", "고가", "저가", "종가", "거래량"]]

    ind  = compute_indicators(df, currency="USD")
    cur  = ind["current"]
    pt   = ind["price_targets"]

    close     = df["종가"].astype(float)
    price_now = float(close.iloc[-1])
    price_3m  = float(close.iloc[max(0, len(close) - 63)])
    return_3m = round((price_now / price_3m - 1) * 100, 2) if price_3m > 0 else None

    return {
        "current_price":  round(price_now, 2),
        "recommendation": cur["recommendation"],
        "rsi":            cur["rsi"],
        "return_3m":      return_3m,
        "buy_target":     pt["buy_target"],
        "sell_target":    pt["sell_target"],
    }


def get_kr_sector(ticker: str, date_str: str) -> str:
    try:
        df = pykrx_stock.get_market_sector_classifications(date_str, "KOSPI")
        if ticker in df.index and "업종명" in df.columns:
            return str(df.at[ticker, "업종명"])
        if "종목코드" in df.columns:
            match = df[df["종목코드"] == ticker]
            if not match.empty:
                return str(match.iloc[0]["업종명"])
    except Exception:
        pass
    return ""


def get_us_peers(ticker: str, launch_time: Optional[str] = None) -> dict:
    if launch_time:
        end_dt = _to_business_day(datetime.strptime(launch_time, "%Y%m%d"))
    else:
        end_dt = _last_business_day()
    date_str  = _date_str(end_dt)
    cache_key = f"us_peers_{ticker}_{date_str}"
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

    sector       = get_kr_sector(ticker, date_str)
    peer_configs = SECTOR_US_PEERS.get(sector, SECTOR_US_PEERS["_default"])

    peers = []
    for sym, name in peer_configs:
        try:
            snap = _quick_us_snapshot(sym)
        except Exception:
            snap = {"current_price": 0.0, "recommendation": "중립", "rsi": None,
                    "return_3m": None, "buy_target": 0.0, "sell_target": 0.0}
        peers.append({"symbol": sym, "name": name, **snap})

    out = {"kr_sector": sector or "알 수 없음", "peers": peers, "cached": False}
    mem_cache[cache_key] = out
    _save_disk(cache_key, out)
    return out


def find_similar_signals(ticker: str, current_analysis: dict) -> dict:
    from services.volatility_service import compute_top10_volatility

    cur     = current_analysis.get("current", {})
    cur_rec = cur.get("recommendation", "중립")
    cur_score = cur.get("score", 0)

    cache_key = f"similar_{ticker}_{current_analysis.get('as_of_date', '')}"
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

    top20    = compute_top10_volatility()["stocks"]
    episodes = []

    for s in top20:
        if s["ticker"] == ticker:
            continue
        try:
            a = compute_kr_analysis(s["ticker"])
        except Exception:
            continue

        ohlcv   = a.get("ohlcv", [])
        signals = a.get("signals", [])

        for sig in signals:
            # Match signals in the same direction (buy ↔ buy, sell ↔ sell)
            sig_score = sig.get("score", 0)
            if cur_score == 0 or sig_score == 0:
                continue
            if (sig_score > 0) != (cur_score > 0):
                continue

            sig_date  = sig["date"]
            sig_price = sig["price"]

            future = [o for o in ohlcv if o["date"] > sig_date]
            if len(future) < 10:
                continue

            r30 = future[min(21, len(future) - 1)]["close"]
            r60 = future[min(43, len(future) - 1)]["close"]
            ret_30 = round((r30 / sig_price - 1) * 100, 1) if sig_price > 0 else None
            ret_60 = round((r60 / sig_price - 1) * 100, 1) if sig_price > 0 else None

            sim = 0.9 if sig["type"] == cur_rec else 0.7
            sim = round(max(sim - 0.1 * abs(sig_score - cur_score), 0.3), 2)

            episodes.append({
                "ticker":       s["ticker"],
                "name":         s["name"],
                "signal_date":  sig_date,
                "signal_price": sig_price,
                "signal_type":  sig["type"],
                "triggers":     sig["triggers"],
                "similarity":   sim,
                "return_30d":   ret_30,
                "return_60d":   ret_60,
                "outcome":      "상승" if (ret_60 or 0) > 0 else "하락",
            })

    episodes.sort(key=lambda x: x["similarity"], reverse=True)

    out = {"episodes": episodes[:5], "cached": False}
    mem_cache[cache_key] = out
    _save_disk(cache_key, out)
    return out
