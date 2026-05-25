import { useState, useCallback } from "react";
import { API_BASE } from "../constants/api";

export type UsStockSummary = {
  symbol: string;
  name: string;
  current_price: number;
  recommendation: string;
  rsi: number | null;
  return_3m: number | null;
  buy_target: number;
  sell_target: number;
};

type State = {
  stocks: UsStockSummary[];
  asOfDate: string;
  loading: boolean;
  error: string | null;
  cached: boolean;
};

export function useUsStocks() {
  const [state, setState] = useState<State>({
    stocks: [],
    asOfDate: "",
    loading: false,
    error: null,
    cached: false,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120 * 1000);
      const res = await fetch(`${API_BASE}/us/energy`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`서버 오류: HTTP ${res.status}`);
      const json = await res.json();
      setState({
        stocks:   json.stocks,
        asOfDate: json.as_of_date,
        loading:  false,
        error:    null,
        cached:   json.cached,
      });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message ?? "알 수 없는 오류" }));
    }
  }, []);

  return { ...state, load };
}
