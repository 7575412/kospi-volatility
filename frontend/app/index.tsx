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
import { StockCard } from "../components/StockCard";
import { SkeletonCard } from "../components/SkeletonCard";

type Tab = "KR" | "US";

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

  const kr = useVolatility(launchTime);
  const us = useUsStocks();

  useEffect(() => { kr.refresh(); }, []);
  useEffect(() => { if (tab === "US" && us.stocks.length === 0) us.load(); }, [tab]);

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
