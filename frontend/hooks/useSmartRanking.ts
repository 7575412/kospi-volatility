import { useState, useCallback } from "react";
import { API_BASE } from "../constants/api";
import { fetchWithTimeout } from "../constants/fetch";

export type ScoreBreakdown = {
  trv: number;
  tech: number;
  per_s: number;
  vol_s: number;
};

export type SmartStock = {
  rank: number;
  ticker: string;
  name: string;
  current_price: number;
  trading_value: number;
  return_1d: number;
  per: number;
  eps: number;
  recommendation: string;
  rsi: number | null;
  volume_ratio: number;
  ma_trend: "bullish" | "bearish" | "neutral";
  composite_score: number;
  tech_score: number;
  score_breakdown?: ScoreBreakdown;
};

export type BestPick = SmartStock & { reason: string; sell_score?: number };

export type SmartRankingData = {
  as_of_date: string;
  stocks: SmartStock[];
  best_buy: BestPick | null;
  best_sell: BestPick | null;
  cached: boolean;
};

type State = { data: SmartRankingData | null; loading: boolean; error: string | null };

export function useSmartRanking(launchTime?: string) {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const url = `${API_BASE}/kospi/smart-ranking${launchTime ? `?launch_time=${launchTime}` : ""}`;
      const res = await fetchWithTimeout(url, 180_000);
      if (!res.ok) throw new Error(`서버 오류: HTTP ${res.status}`);
      const json: SmartRankingData = await res.json();
      setState({ data: json, loading: false, error: null });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message ?? "알 수 없는 오류" }));
    }
  }, [launchTime]);

  return { ...state, load };
}
