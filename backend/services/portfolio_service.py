from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Optional

from services.analysis_service import compute_kr_analysis
from services.us_stock_service import compute_us_analysis


def _analyze_holding(ticker: str, market: str, quantity: float, avg_cost: float, launch_time: Optional[str]) -> dict:
    try:
        if market.upper() == "KR":
            data = compute_kr_analysis(ticker, launch_time)
            current_price = float(data["current_price"])
            currency = "KRW"
        else:
            data = compute_us_analysis(ticker.upper())
            current_price = float(data["current_price"])
            currency = "USD"

        value      = current_price * quantity
        cost_basis = avg_cost * quantity
        gain_loss  = value - cost_basis
        gain_loss_pct = round((gain_loss / cost_basis) * 100, 2) if cost_basis > 0 else 0.0

        rsi = None
        try:
            rsi = round(float(data["current"]["rsi"]), 1)
        except (KeyError, TypeError):
            pass

        recommendation = ""
        try:
            recommendation = data["current"]["recommendation"]
        except (KeyError, TypeError):
            pass

        return {
            "ticker":        ticker,
            "name":          data.get("name", ticker),
            "market":        market.upper(),
            "quantity":      quantity,
            "avg_cost":      avg_cost,
            "current_price": current_price,
            "currency":      currency,
            "value":         round(value, 2),
            "cost_basis":    round(cost_basis, 2),
            "gain_loss":     round(gain_loss, 2),
            "gain_loss_pct": gain_loss_pct,
            "recommendation": recommendation,
            "rsi":           rsi,
            "error":         None,
        }
    except Exception as e:
        return {
            "ticker":         ticker,
            "name":           ticker,
            "market":         market.upper(),
            "quantity":       quantity,
            "avg_cost":       avg_cost,
            "current_price":  0.0,
            "currency":       "KRW" if market.upper() == "KR" else "USD",
            "value":          0.0,
            "cost_basis":     round(avg_cost * quantity, 2),
            "gain_loss":      0.0,
            "gain_loss_pct":  0.0,
            "recommendation": "",
            "rsi":            None,
            "error":          str(e),
        }


def compute_portfolio(holdings: list[dict], launch_time: Optional[str] = None) -> dict:
    results = [None] * len(holdings)

    with ThreadPoolExecutor(max_workers=min(len(holdings), 8)) as executor:
        future_to_idx = {
            executor.submit(
                _analyze_holding,
                h["ticker"], h["market"], h["quantity"], h["avg_cost"], launch_time
            ): i
            for i, h in enumerate(holdings)
        }
        for future in as_completed(future_to_idx):
            results[future_to_idx[future]] = future.result()

    # Group totals by currency
    by_currency: dict[str, dict] = {}
    for r in results:
        if r["error"]:
            continue
        cur = r["currency"]
        if cur not in by_currency:
            by_currency[cur] = {"total_value": 0.0, "total_cost": 0.0}
        by_currency[cur]["total_value"] += r["value"]
        by_currency[cur]["total_cost"]  += r["cost_basis"]

    summary = []
    for cur, totals in by_currency.items():
        v, c = totals["total_value"], totals["total_cost"]
        gain_loss = round(v - c, 2)
        summary.append({
            "currency":      cur,
            "total_value":   round(v, 2),
            "total_cost":    round(c, 2),
            "gain_loss":     gain_loss,
            "gain_loss_pct": round((gain_loss / c) * 100, 2) if c > 0 else 0.0,
        })

    as_of_date = launch_time or datetime.today().strftime("%Y%m%d")
    any_cached = any(
        (r.get("error") is None)
        for r in results
    )

    return {
        "as_of_date": as_of_date,
        "holdings":   results,
        "summary":    summary,
        "cached":     False,
    }
