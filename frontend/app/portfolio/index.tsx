import React, { useState, useMemo, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  FlatList, View, Text, StyleSheet,
  TouchableOpacity, TextInput, ActivityIndicator,
  RefreshControl, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  usePortfolio,
  PortfolioInput,
  PortfolioHoldingResult,
  CurrencySummary,
} from "../../hooks/usePortfolio";

const REC_COLOR: Record<string, string> = {
  강매수: "#1DB954",
  매수:   "#30D158",
  중립:   "#636366",
  매도:   "#FF9F0A",
  강매도: "#FF453A",
};

const EMPTY_FORM = { ticker: "", market: "KR" as "KR" | "US", quantity: "", avg_cost: "" };

function SummaryCard({ s }: { s: CurrencySummary }) {
  const positive = s.gain_loss >= 0;
  const symbol = s.currency === "KRW" ? "₩" : "$";
  const fmt = (v: number) =>
    s.currency === "KRW"
      ? v.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
      : v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryCurrency}>{s.currency}</Text>
      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.summaryLabel}>평가금액</Text>
          <Text style={styles.summaryValue}>{symbol}{fmt(s.total_value)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.summaryLabel}>수익</Text>
          <Text style={[styles.summaryGain, positive ? styles.up : styles.down]}>
            {positive ? "+" : ""}{symbol}{fmt(s.gain_loss)}
          </Text>
          <Text style={[styles.summaryPct, positive ? styles.up : styles.down]}>
            {positive ? "+" : ""}{s.gain_loss_pct.toFixed(2)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

function HoldingCard({
  item,
  onRemove,
  onPress,
}: {
  item: PortfolioHoldingResult;
  onRemove: () => void;
  onPress: () => void;
}) {
  const positive = item.gain_loss >= 0;
  const recColor = REC_COLOR[item.recommendation] ?? "#636366";
  const symbol = item.currency === "KRW" ? "₩" : "$";
  const fmtPrice = (v: number) =>
    item.currency === "KRW"
      ? v.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
      : v.toFixed(2);

  if (item.error) {
    return (
      <View style={[styles.card, styles.cardError]}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTicker}>{item.ticker}</Text>
          <Text style={styles.cardErrorText} numberOfLines={1}>{item.error}</Text>
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.removeBtn}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={onPress}>
      <View style={styles.cardLeft}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.marketBadge}>
            <Text style={styles.marketBadgeText}>{item.market}</Text>
          </View>
        </View>
        <Text style={styles.cardTicker}>{item.ticker}</Text>
        <View style={styles.cardPriceRow}>
          <Text style={styles.cardPrice}>{symbol}{fmtPrice(item.current_price)}</Text>
          <Text style={styles.cardAvg}>  평균 {symbol}{fmtPrice(item.avg_cost)}</Text>
        </View>
        <Text style={styles.cardQty}>{item.quantity}주 · 평가 {symbol}{fmtPrice(item.value)}</Text>
      </View>
      <View style={styles.cardRight}>
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.removeBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={[styles.cardGainPct, positive ? styles.up : styles.down]}>
          {positive ? "+" : ""}{item.gain_loss_pct.toFixed(2)}%
        </Text>
        {item.recommendation ? (
          <Text style={[styles.cardRec, { color: recColor }]}>{item.recommendation}</Text>
        ) : null}
        {item.rsi != null ? (
          <Text style={styles.cardRsi}>RSI {item.rsi}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const STORAGE_KEY = "portfolio:holdings";

export default function PortfolioScreen() {
  const router = useRouter();
  const [holdings, setHoldings] = useState<PortfolioInput[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formVisible, setFormVisible] = useState(false);
  const [formError, setFormError] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setHoldings(JSON.parse(raw)); } catch {}
      }
      loaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  }, [holdings]);

  const stableHoldings = useMemo(() => holdings, [holdings]);
  const { data, loading, error, load } = usePortfolio(stableHoldings);

  function addHolding() {
    const ticker = form.ticker.trim().toUpperCase();
    const qty = parseFloat(form.quantity);
    const cost = parseFloat(form.avg_cost);

    if (!ticker) return setFormError("종목코드를 입력하세요");
    if (isNaN(qty) || qty <= 0) return setFormError("수량을 입력하세요");
    if (isNaN(cost) || cost <= 0) return setFormError("매수단가를 입력하세요");
    if (holdings.some((h) => h.ticker === ticker && h.market === form.market))
      return setFormError("이미 추가된 종목입니다");

    setHoldings((prev) => [...prev, { ticker, market: form.market, quantity: qty, avg_cost: cost }]);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormVisible(false);
  }

  function removeHolding(ticker: string, market: string) {
    setHoldings((prev) => prev.filter((h) => !(h.ticker === ticker && h.market === market)));
  }

  const Header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>‹ 홈</Text>
      </TouchableOpacity>
      <Text style={styles.title}>내 포트폴리오</Text>

      {/* Summary */}
      {data?.summary?.length ? (
        <View style={styles.summaryRow}>
          {data.summary.map((s) => <SummaryCard key={s.currency} s={s} />)}
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {holdings.length > 0 && (
        <TouchableOpacity style={styles.analyzeBtn} onPress={load} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#000" size="small" />
            : <Text style={styles.analyzeBtnText}>분석 실행</Text>}
        </TouchableOpacity>
      )}

      {/* Add form toggle */}
      <TouchableOpacity
        style={styles.addToggle}
        onPress={() => { setFormVisible((v) => !v); setFormError(""); }}
      >
        <Text style={styles.addToggleText}>{formVisible ? "✕ 취소" : "+ 종목 추가"}</Text>
      </TouchableOpacity>

      {formVisible && (
        <View style={styles.form}>
          <View style={styles.formRow}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              placeholder="종목코드 (예: 005930)"
              placeholderTextColor="#636366"
              value={form.ticker}
              onChangeText={(t) => setForm((f) => ({ ...f, ticker: t }))}
              autoCapitalize="characters"
            />
            <View style={styles.marketToggle}>
              {(["KR", "US"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.marketOption, form.market === m && styles.marketOptionActive]}
                  onPress={() => setForm((f) => ({ ...f, market: m }))}
                >
                  <Text style={[styles.marketOptionText, form.market === m && styles.marketOptionTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.formRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="수량"
              placeholderTextColor="#636366"
              value={form.quantity}
              onChangeText={(t) => setForm((f) => ({ ...f, quantity: t }))}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { flex: 2 }]}
              placeholder="매수평균단가"
              placeholderTextColor="#636366"
              value={form.avg_cost}
              onChangeText={(t) => setForm((f) => ({ ...f, avg_cost: t }))}
              keyboardType="numeric"
            />
          </View>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <TouchableOpacity style={styles.addBtn} onPress={addHolding}>
            <Text style={styles.addBtnText}>추가</Text>
          </TouchableOpacity>
        </View>
      )}

      {holdings.length > 0 && (
        <Text style={styles.sectionTitle}>보유 종목 {holdings.length}개</Text>
      )}
    </View>
  );

  const resultMap = useMemo(() => {
    const m: Record<string, PortfolioHoldingResult> = {};
    for (const r of data?.holdings ?? []) m[`${r.ticker}:${r.market}`] = r;
    return m;
  }, [data]);

  if (holdings.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {Header}
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>포트폴리오가 비어 있습니다</Text>
          <Text style={styles.emptyHint}>종목을 추가하고 손익을 확인하세요</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={holdings}
          keyExtractor={(h) => `${h.ticker}:${h.market}`}
          renderItem={({ item }) => {
            const result = resultMap[`${item.ticker}:${item.market}`];
            if (!result) {
              return (
                <View style={styles.card}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardName}>{item.ticker}</Text>
                    <Text style={styles.cardTicker}>{item.market} · {item.quantity}주</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeHolding(item.ticker, item.market)}>
                    <Text style={styles.removeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            return (
              <HoldingCard
                item={result}
                onRemove={() => removeHolding(item.ticker, item.market)}
                onPress={() =>
                  router.push({
                    pathname: "/analysis/[ticker]",
                    params: { ticker: item.ticker, name: result.name },
                  })
                }
              />
            );
          }}
          ListHeaderComponent={Header}
          ListFooterComponent={<View style={{ height: 40 }} />}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              tintColor="#FF9F0A"
              title="분석 중..."
              titleColor="#8E8E93"
            />
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },

  header:   { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn:  { marginBottom: 8 },
  backText: { color: "#FF9F0A", fontSize: 16 },
  title:    { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginBottom: 12 },

  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryCard: {
    flex: 1, backgroundColor: "#1C1C1E", borderRadius: 14,
    padding: 14,
  },
  summaryCurrency: { color: "#8E8E93", fontSize: 11, fontWeight: "700", marginBottom: 8 },
  summaryLabel:    { color: "#636366", fontSize: 11 },
  summaryValue:    { color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginTop: 2 },
  summaryGain:     { fontSize: 15, fontWeight: "700", marginTop: 2 },
  summaryPct:      { fontSize: 13, fontWeight: "600" },

  errorBox:  { backgroundColor: "#2C1A1A", borderRadius: 10, padding: 12, marginBottom: 10 },
  errorText: { color: "#FF453A", fontSize: 14 },

  analyzeBtn: {
    backgroundColor: "#FF9F0A", borderRadius: 12,
    paddingVertical: 12, alignItems: "center", marginBottom: 10,
  },
  analyzeBtnText: { color: "#000000", fontWeight: "700", fontSize: 15 },

  addToggle:     { paddingVertical: 10, alignItems: "center" },
  addToggleText: { color: "#FF9F0A", fontSize: 15, fontWeight: "600" },

  form:    { backgroundColor: "#1C1C1E", borderRadius: 14, padding: 14, gap: 10, marginBottom: 10 },
  formRow: { flexDirection: "row", gap: 8 },
  input: {
    backgroundColor: "#2C2C2E", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    color: "#FFFFFF", fontSize: 14,
  },
  marketToggle: {
    flexDirection: "row", backgroundColor: "#2C2C2E",
    borderRadius: 10, overflow: "hidden",
  },
  marketOption:         { paddingHorizontal: 14, paddingVertical: 10, justifyContent: "center" },
  marketOptionActive:   { backgroundColor: "#FF9F0A" },
  marketOptionText:     { color: "#636366", fontWeight: "700", fontSize: 14 },
  marketOptionTextActive: { color: "#000000" },
  formError:  { color: "#FF453A", fontSize: 13 },
  addBtn:     { backgroundColor: "#2C2C2E", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  addBtnText: { color: "#FF9F0A", fontWeight: "700", fontSize: 15 },

  sectionTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", marginTop: 8, marginBottom: 4 },

  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1C1C1E", borderRadius: 14,
    marginHorizontal: 16, marginVertical: 5, padding: 14,
  },
  cardError:    { borderWidth: 1, borderColor: "#3A1A1A" },
  cardLeft:     { flex: 1 },
  cardRight:    { alignItems: "flex-end", marginLeft: 10 },
  cardTopRow:   { flexDirection: "row", alignItems: "center", gap: 6 },
  cardName:     { color: "#FFFFFF", fontSize: 14, fontWeight: "600", flex: 1 },
  cardTicker:   { color: "#636366", fontSize: 12, marginTop: 1 },
  cardPriceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 6 },
  cardPrice:    { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  cardAvg:      { color: "#8E8E93", fontSize: 12 },
  cardQty:      { color: "#636366", fontSize: 11, marginTop: 3 },
  cardErrorText:{ color: "#FF453A", fontSize: 12, marginTop: 4 },
  cardGainPct:  { fontSize: 16, fontWeight: "700" },
  cardRec:      { fontSize: 13, fontWeight: "700", marginTop: 4 },
  cardRsi:      { color: "#636366", fontSize: 11, marginTop: 2 },
  marketBadge:  { backgroundColor: "#2C2C2E", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  marketBadgeText: { color: "#8E8E93", fontSize: 10, fontWeight: "700" },
  removeBtn:    { color: "#636366", fontSize: 18, padding: 4 },

  empty:      { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 80 },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  emptyHint:  { color: "#8E8E93", fontSize: 14, marginTop: 8 },

  up:   { color: "#30D158" },
  down: { color: "#FF453A" },
});
