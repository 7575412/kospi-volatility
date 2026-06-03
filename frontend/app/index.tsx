import React, { useEffect, useRef, useState } from "react";
import {
  FlatList, RefreshControl, View, Text,
  StyleSheet, StatusBar, ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useVolatility, StockItem } from "../hooks/useVolatility";
import { useUsStocks, UsStockSummary } from "../hooks/useUsStocks";
import { useSmartRanking, SmartStock, BestPick } from "../hooks/useSmartRanking";
import { StockCard } from "../components/StockCard";
import { SkeletonCard } from "../components/SkeletonCard";

type Tab = "KR" | "US" | "PICK";

function toLaunchDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

const REC_COLOR: Record<string, string> = {
  강매수: "#1DB954",
  매수:   "#30D158",
  중립:   "#636366",
  매도:   "#FF9F0A",
  강매도: "#FF453A",
};

function BestPickCard({ pick, label }: { pick: BestPick; label: string }) {
  const router = useRouter();
  const recColor = REC_COLOR[pick.recommendation] ?? "#636366";
  const isBuy = label === "매수";
  return (
    <TouchableOpacity
      style={[styles.pickCard, isBuy ? styles.pickCardBuy : styles.pickCardSell]}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: "/analysis/[ticker]", params: { ticker: pick.ticker, name: pick.name } })}
    >
      <Text style={styles.pickCardLabel}>{isBuy ? "★ 최적 매수" : "★ 최적 매도"}</Text>
      <Text style={styles.pickName} numberOfLines={1}>{pick.name}</Text>
      <Text style={styles.pickTicker}>{pick.ticker}</Text>
      <Text style={[styles.pickRec, { color: recColor }]}>{pick.recommendation}</Text>
      <Text style={styles.pickReason} numberOfLines={2}>{pick.reason}</Text>
      <View style={styles.pickMeta}>
        <Text style={styles.pickMetaText}>점수 {pick.composite_score.toFixed(0)}</Text>
        <Text style={styles.pickMetaText}>RSI {pick.rsi?.toFixed(0) ?? "—"}</Text>
        <Text style={styles.pickMetaText}>PER {pick.per.toFixed(1)}</Text>
      </View>
      {pick.score_breakdown && (
        <View style={styles.scoreBreakdown}>
          <Text style={styles.scoreChip}>거래대금 {pick.score_breakdown.trv.toFixed(0)}</Text>
          <Text style={styles.scoreChip}>기술 {pick.score_breakdown.tech.toFixed(0)}</Text>
          <Text style={styles.scoreChip}>PER {pick.score_breakdown.per_s.toFixed(0)}</Text>
          <Text style={styles.scoreChip}>거래량 {pick.score_breakdown.vol_s.toFixed(0)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SmartRow({ item }: { item: SmartStock }) {
  const router = useRouter();
  const recColor = REC_COLOR[item.recommendation] ?? "#636366";
  const positive = item.return_1d >= 0;
  const barWidth = Math.max(4, Math.min(100, item.composite_score));
  return (
    <TouchableOpacity
      style={styles.smartRow}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: "/analysis/[ticker]", params: { ticker: item.ticker, name: item.name } })}
    >
      <Text style={styles.smartRank}>{item.rank}</Text>
      <View style={styles.smartInfo}>
        <Text style={styles.smartName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.smartTicker}>{item.ticker}</Text>
        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, { width: `${barWidth}%` as any }]} />
        </View>
        {item.score_breakdown && (
          <View style={styles.scoreBreakdown}>
            <Text style={styles.scoreChip}>거래대금 {item.score_breakdown.trv.toFixed(0)}</Text>
            <Text style={styles.scoreChip}>기술 {item.score_breakdown.tech.toFixed(0)}</Text>
            <Text style={styles.scoreChip}>PER {item.score_breakdown.per_s.toFixed(0)}</Text>
            <Text style={styles.scoreChip}>거래량 {item.score_breakdown.vol_s.toFixed(0)}</Text>
          </View>
        )}
      </View>
      <View style={styles.smartMetrics}>
        <Text style={[styles.smartRec, { color: recColor }]}>{item.recommendation}</Text>
        <Text style={[styles.smartReturn, positive ? styles.up : styles.down]}>
          {positive ? "+" : ""}{item.return_1d.toFixed(2)}%
        </Text>
        <Text style={styles.smartPer}>PER {item.per.toFixed(1)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function UsCard({ item }: { item: UsStockSummary }) {
  const router = useRouter();
  const positive = (item.return_3m ?? 0) >= 0;
  const recColor = REC_COLOR[item.recommendation] ?? "#636366";
  return (
    <TouchableOpacity
      style={styles.usCard}
      activeOpacity={0.7}
      onPress={() =>
        router.push({ pathname: "/analysis/[ticker]", params: { ticker: item.symbol, name: item.name } })
      }
    >
      <View style={styles.usBadge}>
        <Text style={styles.usBadgeText} numberOfLines={1}>{item.symbol}</Text>
      </View>
      <View style={styles.usInfo}>
        <Text style={styles.usName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.usTargets}>
          <Text style={styles.usBuy}>매수 ${item.buy_target.toFixed(2)}</Text>
          <Text style={styles.usSell}>매도 ${item.sell_target.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.usMetrics}>
        <Text style={[styles.usRec, { color: recColor }]}>{item.recommendation}</Text>
        <Text style={[styles.usReturn, positive ? styles.up : styles.down]}>
          {item.return_3m != null ? `${positive ? "+" : ""}${item.return_3m.toFixed(1)}%` : "—"}
        </Text>
        <Text style={styles.usPrice}>${item.current_price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>("KR");
  const launchTime = useRef(toLaunchDate(new Date())).current;

  const kr    = useVolatility(launchTime);
  const us    = useUsStocks();
  const smart = useSmartRanking(launchTime);

  useEffect(() => { kr.refresh(); }, []);
  useEffect(() => { if (tab === "US"   && us.stocks.length === 0) us.load();     }, [tab]);
  useEffect(() => { if (tab === "PICK" && !smart.data)            smart.load();  }, [tab]);

  const formattedDate = kr.asOfDate
    ? `${kr.asOfDate.slice(0, 4)}.${kr.asOfDate.slice(4, 6)}.${kr.asOfDate.slice(6, 8)}`
    : "";

  // ── Korean tab header ─────────────────────────────────────────────────
  const KrHeader = (
    <View style={styles.header}>
      <Text style={styles.title}>KOSPI 변동성 TOP 20</Text>
      <Text style={styles.subtitle}>최근 3개월 일별 수익률 표준편차 기준</Text>
      {formattedDate ? (
        <Text style={styles.dateText}>
          기준일: {formattedDate} (앱 실행 시점){kr.cached ? " · 캐시됨" : ""}
        </Text>
      ) : null}
      <Text style={styles.hint}>종목 탭 → 기술적 분석 및 매수·매도 신호</Text>
      {kr.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{kr.error}</Text>
          <Text style={styles.errorHint}>아래로 당겨 재시도</Text>
        </View>
      ) : null}
      {kr.loading && kr.stocks.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#FF9F0A" size="small" style={{ marginRight: 8 }} />
          <Text style={styles.loadingText}>전체 KOSPI 데이터 수집 중... (약 1~2분 소요)</Text>
        </View>
      ) : null}
    </View>
  );

  // ── Smart Ranking header ──────────────────────────────────────────────
  const PickHeader = (
    <View style={styles.header}>
      <Text style={styles.title}>스마트 추천</Text>
      <Text style={styles.subtitle}>거래대금 · 기술지표 · PER · 거래량 종합 TOP 15</Text>
      {smart.data?.as_of_date ? (
        <Text style={styles.dateText}>
          기준일: {smart.data.as_of_date.slice(0, 4)}.{smart.data.as_of_date.slice(4, 6)}.{smart.data.as_of_date.slice(6)}
          {smart.data.cached ? " · 캐시됨" : ""}
        </Text>
      ) : null}
      {smart.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{smart.error}</Text>
          <Text style={styles.errorHint}>아래로 당겨 재시도</Text>
        </View>
      ) : null}
      {smart.loading && !smart.data ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#FF9F0A" size="small" style={{ marginRight: 8 }} />
          <Text style={styles.loadingText}>전체 KOSPI 분석 중... (1~3분 소요)</Text>
        </View>
      ) : null}
      {smart.data?.best_buy || smart.data?.best_sell ? (
        <View style={styles.pickRow}>
          {smart.data.best_buy  && <BestPickCard pick={smart.data.best_buy}  label="매수" />}
          {smart.data.best_sell && <BestPickCard pick={smart.data.best_sell} label="매도" />}
        </View>
      ) : null}
      {smart.data?.stocks?.length ? (
        <Text style={styles.sectionTitle}>순위별 종목</Text>
      ) : null}
    </View>
  );

  // ── US tab header ─────────────────────────────────────────────────────
  const UsHeader = (
    <View style={styles.header}>
      <Text style={styles.title}>미국 에너지주</Text>
      <Text style={styles.subtitle}>RSI · MACD · 볼린저밴드 · ±10% 목표가</Text>
      {us.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{us.error}</Text>
          <Text style={styles.errorHint}>아래로 당겨 재시도</Text>
        </View>
      ) : null}
      {us.loading && us.stocks.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#FF9F0A" size="small" style={{ marginRight: 8 }} />
          <Text style={styles.loadingText}>미국 에너지주 데이터 수집 중...</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === "KR" && styles.tabActive]}
          onPress={() => setTab("KR")}
        >
          <Text style={[styles.tabText, tab === "KR" && styles.tabTextActive]}>🇰🇷 한국</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === "US" && styles.tabActive]}
          onPress={() => setTab("US")}
        >
          <Text style={[styles.tabText, tab === "US" && styles.tabTextActive]}>🇺🇸 미국</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === "PICK" && styles.tabActive]}
          onPress={() => setTab("PICK")}
        >
          <Text style={[styles.tabText, tab === "PICK" && styles.tabTextActive]}>★ 추천</Text>
        </TouchableOpacity>
      </View>

      {/* Korean tab */}
      {tab === "KR" && (
        kr.loading && kr.stocks.length === 0 ? (
          <View style={styles.skeletonContainer}>
            {KrHeader}
            {[...Array(20)].map((_, i) => <SkeletonCard key={i} />)}
          </View>
        ) : (
          <FlatList
            data={kr.stocks}
            keyExtractor={(item: StockItem) => item.ticker}
            renderItem={({ item }) => <StockCard item={item} launchTime={launchTime} />}
            ListHeaderComponent={KrHeader}
            ListFooterComponent={<View style={{ height: 32 }} />}
            refreshControl={
              <RefreshControl
                refreshing={kr.loading}
                onRefresh={kr.refresh}
                tintColor="#FF9F0A"
                title="업데이트 중..."
                titleColor="#8E8E93"
              />
            }
          />
        )
      )}

      {/* Smart Ranking tab */}
      {tab === "PICK" && (
        <FlatList
          data={smart.data?.stocks ?? []}
          keyExtractor={(item) => item.ticker}
          renderItem={({ item }) => <SmartRow item={item} />}
          ListHeaderComponent={PickHeader}
          ListFooterComponent={<View style={{ height: 32 }} />}
          refreshControl={
            <RefreshControl
              refreshing={smart.loading}
              onRefresh={smart.load}
              tintColor="#FF9F0A"
              title="업데이트 중..."
              titleColor="#8E8E93"
            />
          }
        />
      )}

      {/* US tab */}
      {tab === "US" && (
        <FlatList
          data={us.stocks}
          keyExtractor={(item) => item.symbol}
          renderItem={({ item }) => <UsCard item={item} />}
          ListHeaderComponent={UsHeader}
          ListFooterComponent={<View style={{ height: 32 }} />}
          refreshControl={
            <RefreshControl
              refreshing={us.loading}
              onRefresh={us.load}
              tintColor="#FF9F0A"
              title="업데이트 중..."
              titleColor="#8E8E93"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#000000" },
  skeletonContainer: { flex: 1 },

  tabBar:      {
    flexDirection: "row", backgroundColor: "#1C1C1E",
    borderBottomWidth: 1, borderBottomColor: "#2C2C2E",
  },
  tabItem:     { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive:   { borderBottomWidth: 2, borderBottomColor: "#FF9F0A" },
  tabText:     { color: "#636366", fontSize: 15, fontWeight: "600" },
  tabTextActive: { color: "#FF9F0A" },

  header:      { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  title:       { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  subtitle:    { color: "#8E8E93", fontSize: 13, marginTop: 4 },
  dateText:    { color: "#636366", fontSize: 12, marginTop: 2 },
  hint:        { color: "#FF9F0A", fontSize: 12, marginTop: 4 },
  errorBox:    { backgroundColor: "#2C1A1A", borderRadius: 10, padding: 12, marginTop: 12 },
  errorText:   { color: "#FF453A", fontSize: 14 },
  errorHint:   { color: "#8E8E93", fontSize: 12, marginTop: 4 },
  loadingBox:  { flexDirection: "row", alignItems: "center", marginTop: 12,
                 backgroundColor: "#1C1C1E", borderRadius: 10, padding: 12 },
  loadingText: { color: "#8E8E93", fontSize: 13, flex: 1 },

  sectionTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", marginTop: 20, marginBottom: 4 },

  pickRow:      { flexDirection: "row", gap: 10, marginTop: 12 },
  pickCard:     { flex: 1, borderRadius: 14, padding: 14 },
  pickCardBuy:  { backgroundColor: "#0A2A1A" },
  pickCardSell: { backgroundColor: "#2A0A0A" },
  pickCardLabel:{ color: "#8E8E93", fontSize: 11, marginBottom: 4 },
  pickName:     { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  pickTicker:   { color: "#636366", fontSize: 12, marginTop: 1 },
  pickRec:      { fontSize: 13, fontWeight: "700", marginTop: 6 },
  pickReason:   { color: "#8E8E93", fontSize: 11, marginTop: 4 },
  pickMeta:     { flexDirection: "row", gap: 8, marginTop: 8 },
  pickMetaText: { color: "#636366", fontSize: 11 },

  smartRow:     {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1C1C1E", borderRadius: 12,
    marginHorizontal: 16, marginVertical: 4, padding: 12,
  },
  smartRank:    { color: "#FF9F0A", fontSize: 18, fontWeight: "800", width: 28 },
  smartInfo:    { flex: 1, marginHorizontal: 10 },
  smartName:    { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  smartTicker:  { color: "#636366", fontSize: 12, marginTop: 1 },
  scoreBarBg:    { height: 3, backgroundColor: "#2C2C2E", borderRadius: 2, marginTop: 6 },
  scoreBarFill:  { height: 3, backgroundColor: "#FF9F0A", borderRadius: 2 },
  scoreBreakdown:{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  scoreChip:     { color: "#636366", fontSize: 10 },
  smartMetrics: { alignItems: "flex-end" },
  smartRec:     { fontSize: 13, fontWeight: "700" },
  smartReturn:  { fontSize: 12, fontWeight: "600", marginTop: 2 },
  smartPer:     { color: "#8E8E93", fontSize: 11, marginTop: 2 },

  usCard:      {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1C1C1E", borderRadius: 14,
    marginHorizontal: 16, marginVertical: 6, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  usBadge:     {
    width: 46, height: 36, borderRadius: 8,
    backgroundColor: "#2C2C2E", justifyContent: "center",
    alignItems: "center", marginRight: 12,
  },
  usBadgeText: { color: "#AEAEB2", fontSize: 11, fontWeight: "800" },
  usInfo:      { flex: 1, marginRight: 8 },
  usName:      { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  usTargets:   { flexDirection: "row", gap: 8, marginTop: 4 },
  usBuy:       { color: "#30D158", fontSize: 11 },
  usSell:      { color: "#FF9F0A", fontSize: 11 },
  usMetrics:   { alignItems: "flex-end" },
  usRec:       { fontSize: 14, fontWeight: "700" },
  usReturn:    { fontSize: 12, fontWeight: "600", marginTop: 2 },
  up:          { color: "#30D158" },
  down:        { color: "#FF453A" },
  usPrice:     { color: "#8E8E93", fontSize: 12, marginTop: 2 },
});
