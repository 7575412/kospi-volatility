from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models.schemas import PortfolioHolding, PortfolioResponse
from services.portfolio_service import compute_portfolio

router = APIRouter()


@router.post("/portfolio/analyze", response_model=PortfolioResponse)
def analyze_portfolio(
    holdings: list[PortfolioHolding],
    launch_time: Optional[str] = Query(default=None, description="기준일 YYYYMMDD"),
):
    if not holdings:
        raise HTTPException(status_code=400, detail="holdings 목록이 비어 있습니다")
    if len(holdings) > 50:
        raise HTTPException(status_code=400, detail="최대 50개 종목까지 지원합니다")
    try:
        payload = [h.model_dump() for h in holdings]
        return compute_portfolio(payload, launch_time)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
