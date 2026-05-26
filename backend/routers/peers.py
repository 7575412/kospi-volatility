from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.sector_mapping import get_us_peers, find_similar_signals
from services.analysis_service import compute_kr_analysis

router = APIRouter()


@router.get("/analysis/{ticker}/us-peers")
def get_us_peers_endpoint(ticker: str, launch_time: Optional[str] = Query(None)):
    try:
        return get_us_peers(ticker, launch_time)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/{ticker}/similar-signals")
def get_similar_signals(ticker: str, launch_time: Optional[str] = Query(None)):
    try:
        analysis = compute_kr_analysis(ticker, launch_time)
        return find_similar_signals(ticker, analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
