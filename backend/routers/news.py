from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from services.news_service import fetch_news
from pykrx import stock

router = APIRouter()


@router.get("/news/{ticker}")
def get_news(
    ticker: str,
    launch_time: str = Query(..., description="앱 실행 시각 YYYYMMDD"),
):
    try:
        end_dt   = datetime.strptime(launch_time, "%Y%m%d").replace(hour=23, minute=59)
        start_dt = end_dt - timedelta(days=92)

        name = stock.get_market_ticker_name(ticker)
        articles = fetch_news(ticker, start_dt, end_dt)

        return {
            "ticker":     ticker,
            "name":       name,
            "start_date": start_dt.strftime("%Y.%m.%d"),
            "end_date":   end_dt.strftime("%Y.%m.%d"),
            "count":      len(articles),
            "articles":   articles,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
