import json
import time
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from pykrx import stock
from core.cache import get_cache
from services.analysis_service import _load_krx_ticker_list

CACHE_KEY_PREFIX = "volatility_top10"
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


def _disk_path(date_str: str) -> Path:
    DISK_CACHE_PATH.mkdir(exist_ok=True)
    return DISK_CACHE_PATH / f"volatility_{date_str}.json"


def _load_disk(date_str: str, max_age_seconds: Optional[int] = None) -> Optional[dict]:
    p = _disk_path(date_str)
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


def _save_disk(date_str: str, result: dict) -> None:
    try:
        _disk_path(date_str).write_text(
            json.dumps({**result, "disk_cached_at": time.time()}, ensure_ascii=False)
        )
    except Exception:
        pass



def compute_top10_volatility(launch_time: Optional[str] = None) -> dict:
    if launch_time:
        end_dt = datetime.strptime(launch_time, "%Y%m%d")
    else:
        end_dt = _last_business_day()

    end_str   = _date_str(end_dt)
    cache_key = f"{CACHE_KEY_PREFIX}_{end_str}"
    mem_cache = get_cache()

    # 1순위: 메모리 캐시
    if cache_key in mem_cache:
        result = dict(mem_cache[cache_key])
        result["cached"] = True
        return result

    # 2순위: 디스크 캐시 (서버 재시작 후에도 유효)
    disk = _load_disk(end_str)
    if disk:
        mem_cache[cache_key] = disk
        disk = dict(disk)
        disk["cached"] = True
        return disk

    # 3순위: 실제 계산
    start_dt  = end_dt - timedelta(days=92)
    start_str = _date_str(start_dt)
    tickers   = [t["ticker"] for t in _load_krx_ticker_list() if "유가" in t["market"]]

    records = []
    for ticker in tickers:
        try:
            df = stock.get_market_ohlcv_by_date(start_str, end_str, ticker)
            if df is None or len(df) < 20:
                continue
            close    = df["종가"]
            log_ret  = np.log(close / close.shift(1)).dropna()
            records.append({
                "ticker":        ticker,
                "volatility":    round(float(log_ret.std() * 100), 4),
                "current_price": int(close.iloc[-1]),
                "price_3m_ago":  int(close.iloc[0]),
                "return_3m":     round((int(close.iloc[-1]) / int(close.iloc[0]) - 1) * 100, 2),
            })
        except Exception:
            continue

    records.sort(key=lambda x: x["volatility"], reverse=True)

    stocks_out = []
    for rank, rec in enumerate(records[:20], start=1):
        name = stock.get_market_ticker_name(rec["ticker"])
        stocks_out.append({"rank": rank, "name": name, **rec})

    result = {
        "as_of_date": end_str,
        "data_start":  start_str,
        "stocks":      stocks_out,
        "cached":      False,
    }
    mem_cache[cache_key] = result
    _save_disk(end_str, result)   # 디스크에도 저장
    return result
