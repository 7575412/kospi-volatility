import { useState, useCallback } from "react";
import { API_BASE } from "../constants/api";

export type NewsArticle = {
  title: string;
  date: string;
  url: string;
};

type State = {
  articles: NewsArticle[];
  name: string;
  startDate: string;
  endDate: string;
  loading: boolean;
  error: string | null;
};

export function useNews(ticker: string, launchTime: string) {
  const [state, setState] = useState<State>({
    articles: [],
    name: "",
    startDate: "",
    endDate: "",
    loading: false,
    error: null,
  });

  const fetch_ = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60 * 1000); // 1분 타임아웃
      const res = await fetch(`${API_BASE}/news/${ticker}?launch_time=${launchTime}`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`서버 오류: HTTP ${res.status}`);
      const json = await res.json();
      setState({
        articles:  json.articles,
        name:      json.name,
        startDate: json.start_date,
        endDate:   json.end_date,
        loading:   false,
        error:     null,
      });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message ?? "알 수 없는 오류" }));
    }
  }, [ticker, launchTime]);

  return { ...state, load: fetch_ };
}
