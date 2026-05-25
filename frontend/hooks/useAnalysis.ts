import { useState, useCallback } from "react";
import { API_BASE } from "../constants/api";

export type PriceTargets = {
  ref_price: number;
  buy_target: number;
  sell_target: number;
  buy_pct: number;
  sell_pct: number;
};

export type CurrentIndicators = {
  rsi: number | null;
  macd: number | null;
  macd_signal: number | null;
  bb_pct: number | null;
  ma5: number | null;
  ma20: number | null;
  ma60: number | null;
  recommendation: string;
  score: number;
};

export type Signal = {
  date: string;
  price: number;
  type: string;
  score: number;
  triggers: string[];
};

export type OhlcvEntry = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type AnalysisData = {
  ticker: string;
  name: string;
  as_of_date: string;
  current_price: number;
  currency: string;
  price_targets: PriceTargets;
  current: CurrentIndicators;
  signals: Signal[];
  ohlcv: OhlcvEntry[];
  cached: boolean;
};

type State = {
  data: AnalysisData | null;
  loading: boolean;
  error: string | null;
};

export function useAnalysis(ticker: string, launchTime?: string, isUS = false) {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60 * 1000);
      const url = isUS
        ? `${API_BASE}/us/analysis/${ticker}`
        : `${API_BASE}/analysis/${ticker}${launchTime ? `?launch_time=${launchTime}` : ""}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`서버 오류: HTTP ${res.status}`);
      const json: AnalysisData = await res.json();
      setState({ data: json, loading: false, error: null });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message ?? "알 수 없는 오류" }));
    }
  }, [ticker, launchTime, isUS]);

  return { ...state, load };
}
