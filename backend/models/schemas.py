from pydantic import BaseModel
from typing import Optional


class PortfolioHolding(BaseModel):
    ticker: str
    market: str          # "KR" or "US"
    quantity: float
    avg_cost: float      # per-share cost in native currency


class PortfolioHoldingResult(BaseModel):
    ticker: str
    name: str
    market: str
    quantity: float
    avg_cost: float
    current_price: float
    currency: str
    value: float
    cost_basis: float
    gain_loss: float
    gain_loss_pct: float
    recommendation: str
    rsi: Optional[float] = None
    error: Optional[str] = None


class CurrencySummary(BaseModel):
    currency: str
    total_value: float
    total_cost: float
    gain_loss: float
    gain_loss_pct: float


class PortfolioResponse(BaseModel):
    as_of_date: str
    holdings: list[PortfolioHoldingResult]
    summary: list[CurrencySummary]
    cached: bool


class StockVolatility(BaseModel):
    rank: int
    ticker: str
    name: str
    volatility: float       # daily log-return std-dev (%)
    current_price: int
    price_3m_ago: int
    return_3m: float        # percentage, e.g. 12.3


class VolatilityResponse(BaseModel):
    as_of_date: str         # "20260521"
    data_start: str         # "20260221"
    stocks: list[StockVolatility]
    cached: bool
