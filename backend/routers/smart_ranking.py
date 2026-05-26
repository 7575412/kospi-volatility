from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.smart_ranking_service import compute_smart_ranking

router = APIRouter()


@router.get("/kospi/smart-ranking")
def get_smart_ranking(launch_time: Optional[str] = Query(None)):
    try:
        return compute_smart_ranking(launch_time)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
