import { useState, useCallback } from "react";
import { API_BASE } from "../constants/api";
import { fetchWithTimeout } from "../constants/fetch";

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
      const url = isUS
        ? `${API_BASE}/us/analysis/${ticker}`
        : `${API_BASE}/analysis/${ticker}${launchTime ? `?launch_time=${launchTime}` : ""}`;
      const res = await fetchWithTimeout(url, 60_000);
      if (!res.ok) throw new Error(`서버 오류: HTTP ${res.status}`);
      const json: AnalysisData = await res.json();
      setState({ data: json, loading: false, error: null });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message ?? "알 수 없는 오류" }));
    }
  }, [ticker, launchTime, isUS]);

  return { ...state, load };
}

// ── US Peers ──────────────────────────────────────────────────────────────

export type UsPeer = {
  symbol: string;
  name: string;
  current_price: number;
  recommendation: string;
  rsi: number | null;
  return_3m: number | null;
  buy_target: number;
  sell_target: number;
};

export type PeersData = {
  kr_sector: string;
  peers: UsPeer[];
  cached: boolean;
};

type PeersState = { data: PeersData | null; loading: boolean; error: string | null };

export function usePeers(ticker: string, launchTime?: string) {
  const [state, setState] = useState<PeersState>({ data: null, loading: false, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const lt = launchTime ? `?launch_time=${launchTime}` : "";
      const res = await fetchWithTimeout(`${API_BASE}/analysis/${ticker}/us-peers${lt}`, 60_000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState({ data: await res.json(), loading: false, error: null });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message ?? "오류" }));
    }
  }, [ticker, launchTime]);

  return { ...state, load };
}

// ── Similar Signals ───────────────────────────────────────────────────────

export type SimilarEpisode = {
  ticker: string;
  name: string;
  signal_date: string;
  signal_price: number;
  signal_type: string;
  triggers: string[];
  similarity: number;
  return_30d: number | null;
  return_60d: number | null;
  outcome: string;
};

export type SimilarData = { episodes: SimilarEpisode[]; cached: boolean };

type SimilarState = { data: SimilarData | null; loading: boolean; error: string | null };

export function useSimilarSignals(ticker: string, launchTime?: string) {
  const [state, setState] = useState<SimilarState>({ data: null, loading: false, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const lt = launchTime ? `?launch_time=${launchTime}` : "";
      const res = await fetchWithTimeout(`${API_BASE}/analysis/${ticker}/similar-signals${lt}`, 60_000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState({ data: await res.json(), loading: false, error: null });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message ?? "오류" }));
    }
  }, [ticker, launchTime]);

  return { ...state, load };
}
