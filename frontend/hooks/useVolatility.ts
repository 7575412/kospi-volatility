import { useState, useCallback } from "react";
import { API_BASE } from "../constants/api";
import { fetchWithTimeout } from "../constants/fetch";

export type StockItem = {
  rank: number;
  ticker: string;
  name: string;
  volatility: number;
  current_price: number;
  price_3m_ago: number;
  return_3m: number;
};

type State = {
  stocks: StockItem[];
  asOfDate: string;
  loading: boolean;
  error: string | null;
  cached: boolean;
};

export function useVolatility(launchTime: string) {
  const [state, setState] = useState<State>({
    stocks: [],
    asOfDate: "",
    loading: false,
    error: null,
    cached: false,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetchWithTimeout(`${API_BASE}/volatility?launch_time=${launchTime}`, 5 * 60 * 1000);
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
  }, [launchTime]);

  return { ...state, refresh };
}
