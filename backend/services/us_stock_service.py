from datetime import datetime, timedelta
from typing import Optional
import pandas as pd
from services.analysis_service import (
    compute_indicators, _load_disk, _save_disk, _date_str, get_cache
)

US_ENERGY_STOCKS = [
    {"symbol": "XOM",  "name": "ExxonMobil"},
    {"symbol": "CVX",  "name": "Chevron"},
    {"symbol": "COP",  "name": "ConocoPhillips"},
    {"symbol": "EOG",  "name": "EOG Resources"},
    {"symbol": "OXY",  "name": "Occidental Petroleum"},
    {"symbol": "DVN",  "name": "Devon Energy"},
    {"symbol": "SLB",  "name": "SLB"},
    {"symbol": "HAL",  "name": "Halliburton"},
    {"symbol": "MPC",  "name": "Marathon Petroleum"},
    {"symbol": "PSX",  "name": "Phillips 66"},
]


def _fetch_us_ohlcv(symbol: str, days: int = 360):
    import yfinance as yf
    end   = datetime.today()
    start = end - timedelta(days=days)
    df = yf.download(
        symbol,
        start=start.strftime("%Y-%m-%d"),
        end=end.strftime("%Y-%m-%d"),
        progress=False,
        auto_adjust=True,
    )
    if df.empty:
        raise ValueError(f"No data returned for {symbol}")
    # yfinance 0.2+ may return MultiIndex columns for single-ticker download
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    # Strip timezone from DatetimeIndex to avoid comparison issues
    if hasattr(df.index, "tz") and df.index.tz is not None:
        df.index = df.index.tz_convert(None)
    df = df.rename(columns={
        "Open":   "시가",
        "High":   "고가",
        "Low":    "저가",
        "Close":  "종가",
        "Volume": "거래량",
    })
    return df[["시가", "고가", "저가", "종가", "거래량"]]


def compute_us_analysis(symbol: str) -> dict:
    today_str = _date_str(datetime.today())
    cache_key = f"us_analysis_{symbol}_{today_str}"
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

    name = next((s["name"] for s in US_ENERGY_STOCKS if s["symbol"] == symbol), symbol)
    df   = _fetch_us_ohlcv(symbol)

    if len(df) < 30:
        raise ValueError(f"데이터 부족: {symbol}")

    indicators = compute_indicators(df, currency="USD")

    close       = df["종가"].astype(float)
    price_now   = float(close.iloc[-1])
    price_3m    = float(close.iloc[max(0, len(close) - 63)])
    return_3m   = round((price_now / price_3m - 1) * 100, 2) if price_3m > 0 else None

    result = {
        "ticker":        symbol,
        "name":          name,
        "as_of_date":    today_str,
        "current_price": round(price_now, 2),
        "return_3m":     return_3m,
        "currency":      "USD",
        "cached":        False,
        **indicators,
    }

    mem_cache[cache_key] = result
    _save_disk(cache_key, result)
    return result


def compute_us_energy_list() -> dict:
    today_str = _date_str(datetime.today())
    cache_key = f"us_energy_list_{today_str}"
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

    stocks_out = []
    for s in US_ENERGY_STOCKS:
        try:
            a = compute_us_analysis(s["symbol"])
            stocks_out.append({
                "symbol":         s["symbol"],
                "name":           s["name"],
                "current_price":  a["current_price"],
                "recommendation": a["current"]["recommendation"],
                "rsi":            a["current"]["rsi"],
                "return_3m":      a.get("return_3m"),
                "buy_target":     a["price_targets"]["buy_target"],
                "sell_target":    a["price_targets"]["sell_target"],
            })
        except Exception:
            continue

    result = {
        "as_of_date": today_str,
        "stocks":     stocks_out,
        "cached":     False,
    }

    mem_cache[cache_key] = result
    _save_disk(cache_key, result)
    return result
