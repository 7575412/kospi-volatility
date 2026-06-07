from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from services.news_service import fetch_news
from services.analysis_service import _load_disk, _save_disk
from core.cache import get_cache
from pykrx import stock

router = APIRouter()


@router.get("/news/{ticker}")
def get_news(
    ticker: str,
    launch_time: str = Query(..., description="앱 실행 시각 YYYYMMDD"),
):
    try:
        cache_key = f"news_{ticker}_{launch_time}"
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

        end_dt   = datetime.strptime(launch_time, "%Y%m%d").replace(hour=23, minute=59)
        start_dt = end_dt - timedelta(days=92)

        name     = stock.get_market_ticker_name(ticker)
        articles = fetch_news(ticker, start_dt, end_dt)

        result = {
            "ticker":     ticker,
            "name":       name,
            "start_date": start_dt.strftime("%Y.%m.%d"),
            "end_date":   end_dt.strftime("%Y.%m.%d"),
            "count":      len(articles),
            "articles":   articles,
            "cached":     False,
        }
        mem_cache[cache_key] = result
        _save_disk(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
