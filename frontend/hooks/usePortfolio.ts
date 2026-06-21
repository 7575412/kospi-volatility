import { useState, useCallback } from "react";
import { API_BASE } from "../constants/api";
import { fetchWithTimeout } from "../constants/fetch";

export type PortfolioInput = {
  ticker: string;
  market: "KR" | "US";
  quantity: number;
  avg_cost: number;
};

export type PortfolioHoldingResult = {
  ticker: string;
  name: string;
  market: "KR" | "US";
  quantity: number;
  avg_cost: number;
  current_price: number;
  currency: string;
  value: number;
  cost_basis: number;
  gain_loss: number;
  gain_loss_pct: number;
  recommendation: string;
  rsi: number | null;
  error: string | null;
};

export type CurrencySummary = {
  currency: string;
  total_value: number;
  total_cost: number;
  gain_loss: number;
  gain_loss_pct: number;
};

export type PortfolioData = {
  as_of_date: string;
  holdings: PortfolioHoldingResult[];
  summary: CurrencySummary[];
  cached: boolean;
};

type State = {
  data: PortfolioData | null;
  loading: boolean;
  error: string | null;
};

export function usePortfolio(holdings: PortfolioInput[], launchTime?: string) {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null });

  const load = useCallback(async () => {
    if (holdings.length === 0) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const url = `${API_BASE}/portfolio/analyze${launchTime ? `?launch_time=${launchTime}` : ""}`;
      const res = await fetchWithTimeout(url, 120_000, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(holdings),
      });
      if (!res.ok) throw new Error(`서버 오류: HTTP ${res.status}`);
      const json: PortfolioData = await res.json();
      setState({ data: json, loading: false, error: null });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message ?? "알 수 없는 오류" }));
    }
  }, [holdings, launchTime]);

  return { ...state, load };
}
