from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.volatility_service import compute_top10_volatility
from models.schemas import VolatilityResponse

router = APIRouter()


@router.get("/volatility", response_model=VolatilityResponse)
def get_volatility(launch_time: Optional[str] = Query(default=None, description="앱 실행 시각 YYYYMMDD")):
    try:
        return compute_top10_volatility(launch_time)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
