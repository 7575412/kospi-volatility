import React, { useEffect } from "react";
import {
  FlatList, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUsStocks, UsStockSummary } from "../../hooks/useUsStocks";

const REC_COLOR: Record<string, string> = {
  강매수: "#1DB954",
  매수:   "#30D158",
  중립:   "#636366",
  매도:   "#FF9F0A",
  강매도: "#FF453A",
};

function UsStockCard({ item }: { item: UsStockSummary }) {
  const router = useRouter();
  const recColor = REC_COLOR[item.recommendation] ?? "#636366";
  const positive = (item.return_3m ?? 0) >= 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: "/analysis/[ticker]",
          params: { ticker: item.symbol, name: item.name },
        })
      }
    >
      <View style={styles.symbolBadge}>
        <Text style={styles.symbolText} numberOfLines={1}>{item.symbol}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <View style={styles.targetsRow}>
          <Text style={styles.buyTarget}>매수 ${item.buy_target.toFixed(2)}</Text>
          <Text style={styles.sellTarget}>매도 ${item.sell_target.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <Text style={[styles.rec, { color: recColor }]}>{item.recommendation}</Text>
        <Text style={[styles.returnRate, positive ? styles.up : styles.down]}>
          {item.return_3m != null
            ? `${positive ? "+" : ""}${item.return_3m.toFixed(1)}%`
            : "—"}
        </Text>
        <Text style={styles.price}>${item.current_price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function UsEnergyScreen() {
  const { stocks, asOfDate, loading, error, load, cached } = useUsStocks();

  useEffect(() => { load(); }, []);

  const formattedDate = asOfDate
    ? `${asOfDate.slice(0, 4)}.${asOfDate.slice(4, 6)}.${asOfDate.slice(6, 8)}`
    : "";

  const Header = (
    <View style={styles.header}>
      <Text style={styles.title}>미국 에너지주</Text>
      <Text style={styles.subtitle}>기술적 분석 · RSI / MACD / 볼린저밴드 · ±10% 목표가</Text>
      {formattedDate ? (
        <Text style={styles.dateText}>
          기준일: {formattedDate}{cached ? " · 캐시됨" : ""}
        </Text>
      ) : null}
      <Text style={styles.hint}>종목 탭 → 매수·매도 신호 상세 보기</Text>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>아래로 당겨 재시도</Text>
        </View>
      ) : null}
      {loading && stocks.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#FF9F0A" size="small" style={{ marginRight: 8 }} />
          <Text style={styles.loadingText}>미국 에너지주 데이터 수집 중...</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={stocks}
        keyExtractor={(item) => item.symbol}
        renderItem={({ item }) => <UsStockCard item={item} />}
        ListHeaderComponent={Header}
        ListFooterComponent={<View style={{ height: 32 }} />}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor="#FF9F0A"
            title="업데이트 중..."
            titleColor="#8E8E93"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#000000" },
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

  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1C1C1E", borderRadius: 14,
    marginHorizontal: 16, marginVertical: 6, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  symbolBadge: {
    width: 46, height: 36, borderRadius: 8,
    backgroundColor: "#2C2C2E", justifyContent: "center",
    alignItems: "center", marginRight: 12,
  },
  symbolText:  { color: "#AEAEB2", fontSize: 11, fontWeight: "800" },
  info:        { flex: 1, marginRight: 8 },
  name:        { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  targetsRow:  { flexDirection: "row", gap: 8, marginTop: 4 },
  buyTarget:   { color: "#30D158", fontSize: 11 },
  sellTarget:  { color: "#FF9F0A", fontSize: 11 },
  metrics:     { alignItems: "flex-end" },
  rec:         { fontSize: 14, fontWeight: "700" },
  returnRate:  { fontSize: 12, fontWeight: "600", marginTop: 2 },
  up:          { color: "#30D158" },
  down:        { color: "#FF453A" },
  price:       { color: "#8E8E93", fontSize: 12, marginTop: 2 },
});
