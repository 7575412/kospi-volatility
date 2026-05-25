from fastapi import APIRouter, HTTPException
from services.us_stock_service import compute_us_analysis, compute_us_energy_list

router = APIRouter()


@router.get("/us/energy")
def get_us_energy_list():
    try:
        return compute_us_energy_list()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/us/analysis/{symbol}")
def get_us_analysis(symbol: str):
    try:
        return compute_us_analysis(symbol.upper())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
