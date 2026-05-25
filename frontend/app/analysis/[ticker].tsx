import React, { useEffect } from "react";
import {
  FlatList, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAnalysis, Signal } from "../../hooks/useAnalysis";

const REC_COLOR: Record<string, string> = {
  강매수: "#1DB954",
  매수:   "#30D158",
  중립:   "#636366",
  매도:   "#FF9F0A",
  강매도: "#FF453A",
};

function fmtDate(d: string) {
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
}

function SignalRow({ item }: { item: Signal }) {
  const color = item.score > 0 ? "#30D158" : item.score < 0 ? "#FF453A" : "#636366";
  return (
    <View style={styles.signalRow}>
      <View style={styles.signalLeft}>
        <Text style={[styles.signalType, { color }]}>{item.type}</Text>
        <Text style={styles.signalDate}>{fmtDate(item.date)}</Text>
      </View>
      <View style={styles.signalRight}>
        <Text style={styles.signalPrice}>
          {typeof item.price === "number" && item.price < 1000
            ? `$${item.price.toFixed(2)}`
            : `₩${item.price.toLocaleString()}`}
        </Text>
        <Text style={styles.signalTriggers} numberOfLines={2}>
          {item.triggers.join(" · ")}
        </Text>
      </View>
    </View>
  );
}

export default function AnalysisScreen() {
  const { ticker, name, launchTime } = useLocalSearchParams<{
    ticker: string;
    name: string;
    launchTime?: string;
  }>();
  const router = useRouter();
  const isUS = !!(ticker && ticker.length <= 5 && /^[A-Z]+$/.test(ticker));
  const { data, loading, error, load } = useAnalysis(ticker, launchTime, isUS);

  useEffect(() => { load(); }, []);

  const cur = data?.current;
  const pt  = data?.price_targets;
  const recColor = cur ? (REC_COLOR[cur.recommendation] ?? "#636366") : "#636366";

  const Header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>‹ 뒤로</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{name ?? ticker}</Text>
      <Text style={styles.ticker}>{ticker}</Text>
      {data && (
        <Text style={styles.dateText}>기준일: {fmtDate(data.as_of_date)}</Text>
      )}

      {/* Recommendation card */}
      {cur && (
        <View style={[styles.recCard, { borderColor: recColor }]}>
          <Text style={[styles.recLabel, { color: recColor }]}>{cur.recommendation}</Text>
          <Text style={styles.recPrice}>
            {isUS
              ? `$${data!.current_price.toFixed(2)}`
              : `₩${data!.current_price.toLocaleString()}`}
          </Text>
        </View>
      )}

      {/* ±10% price targets */}
      {pt && (
        <View style={styles.targetsRow}>
          <View style={[styles.targetCard, styles.buyCard]}>
            <Text style={styles.targetLabel}>매수 목표가 (−10%)</Text>
            <Text style={styles.targetPrice}>
              {isUS ? `$${pt.buy_target.toFixed(2)}` : `₩${Math.round(pt.buy_target).toLocaleString()}`}
            </Text>
            <Text style={styles.targetSub}>현재가 대비 −10%</Text>
          </View>
          <View style={[styles.targetCard, styles.sellCard]}>
            <Text style={styles.targetLabel}>매도 목표가 (+10%)</Text>
            <Text style={styles.targetPrice}>
              {isUS ? `$${pt.sell_target.toFixed(2)}` : `₩${Math.round(pt.sell_target).toLocaleString()}`}
            </Text>
            <Text style={styles.targetSub}>현재가 대비 +10%</Text>
          </View>
        </View>
      )}

      {/* Indicator grid */}
      {cur && (
        <View style={styles.grid}>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>RSI (14)</Text>
            <Text style={[
              styles.gridValue,
              { color: cur.rsi != null && cur.rsi < 30 ? "#30D158" : cur.rsi != null && cur.rsi > 70 ? "#FF453A" : "#FFFFFF" }
            ]}>
              {cur.rsi?.toFixed(1) ?? "—"}
            </Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>MACD</Text>
            <Text style={[
              styles.gridValue,
              { color: cur.macd != null && cur.macd_signal != null
                ? cur.macd > cur.macd_signal ? "#30D158" : "#FF453A"
                : "#FFFFFF" }
            ]}>
              {cur.macd != null && cur.macd_signal != null
                ? cur.macd > cur.macd_signal ? "골든크로스" : "데스크로스"
                : "—"}
            </Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>BB위치</Text>
            <Text style={[
              styles.gridValue,
              { color: cur.bb_pct != null
                ? cur.bb_pct < 0.2 ? "#30D158" : cur.bb_pct > 0.8 ? "#FF453A" : "#FFFFFF"
                : "#FFFFFF" }
            ]}>
              {cur.bb_pct != null ? `${(cur.bb_pct * 100).toFixed(0)}%` : "—"}
            </Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>MA5 vs MA20</Text>
            <Text style={[
              styles.gridValue,
              { color: cur.ma5 != null && cur.ma20 != null
                ? cur.ma5 > cur.ma20 ? "#30D158" : "#FF453A"
                : "#FFFFFF" }
            ]}>
              {cur.ma5 != null && cur.ma20 != null
                ? cur.ma5 > cur.ma20 ? "상승배열" : "하락배열"
                : "—"}
            </Text>
          </View>
        </View>
      )}

      {/* Section header */}
      <Text style={styles.sectionTitle}>매수·매도 신호 이력</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#FF9F0A" size="small" style={{ marginRight: 8 }} />
          <Text style={styles.loadingText}>분석 중...</Text>
        </View>
      )}
    </View>
  );

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.container}>
        {Header}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data?.signals ?? []}
        keyExtractor={(item) => `${item.date}-${item.triggers.join()}`}
        renderItem={({ item }) => <SignalRow item={item} />}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>해당 기간 신호가 없습니다.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          !isUS ? (
            <TouchableOpacity
              style={styles.newsBtn}
              onPress={() => router.push({ pathname: "/news/[ticker]", params: { ticker, name, launchTime: launchTime ?? "" } })}
            >
              <Text style={styles.newsBtnText}>뉴스 보기</Text>
            </TouchableOpacity>
          ) : <View style={{ height: 32 }} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#000000" },
  header:       { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn:      { marginBottom: 12 },
  backText:     { color: "#FF9F0A", fontSize: 17 },
  title:        { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  ticker:       { color: "#8E8E93", fontSize: 13, marginTop: 2 },
  dateText:     { color: "#636366", fontSize: 12, marginTop: 4 },

  recCard:      {
    borderWidth: 1.5, borderRadius: 14, padding: 16,
    marginTop: 14, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#1C1C1E",
  },
  recLabel:     { fontSize: 22, fontWeight: "800" },
  recPrice:     { color: "#FFFFFF", fontSize: 20, fontWeight: "600" },

  targetsRow:   { flexDirection: "row", gap: 10, marginTop: 12 },
  targetCard:   { flex: 1, borderRadius: 12, padding: 12 },
  buyCard:      { backgroundColor: "#0A2A1A" },
  sellCard:     { backgroundColor: "#2A0A0A" },
  targetLabel:  { color: "#8E8E93", fontSize: 11, marginBottom: 4 },
  targetPrice:  { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  targetSub:    { color: "#636366", fontSize: 11, marginTop: 2 },

  grid:         { flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 8 },
  gridCell:     {
    width: "47%", backgroundColor: "#1C1C1E",
    borderRadius: 10, padding: 12,
  },
  gridLabel:    { color: "#8E8E93", fontSize: 11, marginBottom: 4 },
  gridValue:    { fontSize: 15, fontWeight: "700" },

  sectionTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", marginTop: 20, marginBottom: 8 },

  signalRow:    {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: "#1C1C1E", borderRadius: 10,
    marginHorizontal: 16, marginVertical: 4, padding: 12,
  },
  signalLeft:   { justifyContent: "center" },
  signalType:   { fontSize: 15, fontWeight: "700" },
  signalDate:   { color: "#636366", fontSize: 12, marginTop: 2 },
  signalRight:  { alignItems: "flex-end", flex: 1, marginLeft: 12 },
  signalPrice:  { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  signalTriggers: { color: "#8E8E93", fontSize: 11, marginTop: 2, textAlign: "right" },

  errorBox:     { backgroundColor: "#2C1A1A", borderRadius: 10, padding: 12, marginTop: 10 },
  errorText:    { color: "#FF453A", fontSize: 13 },
  loadingRow:   { flexDirection: "row", alignItems: "center", marginTop: 12 },
  loadingText:  { color: "#8E8E93", fontSize: 13 },
  emptyBox:     { alignItems: "center", padding: 40 },
  emptyText:    { color: "#636366", fontSize: 14 },

  newsBtn:      {
    margin: 16, backgroundColor: "#1C1C1E",
    borderRadius: 12, padding: 16, alignItems: "center",
  },
  newsBtnText:  { color: "#FF9F0A", fontSize: 16, fontWeight: "700" },
});
