from pydantic import BaseModel


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
