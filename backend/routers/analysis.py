from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.analysis_service import compute_kr_analysis, search_kr_tickers

router = APIRouter()


@router.get("/analysis/{ticker}")
def get_kr_analysis(
    ticker: str,
    launch_time: Optional[str] = Query(default=None, description="기준일 YYYYMMDD"),
):
    try:
        return compute_kr_analysis(ticker, launch_time)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
def search_tickers(q: str = Query(..., description="회사명 검색어")):
    try:
        return {"results": search_kr_tickers(q)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
