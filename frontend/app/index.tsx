import React, { useEffect, useRef } from "react";
import {
  FlatList,
  RefreshControl,
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVolatility, StockItem } from "../hooks/useVolatility";
import { StockCard } from "../components/StockCard";
import { SkeletonCard } from "../components/SkeletonCard";

function toLaunchDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export default function HomeScreen() {
  // 앱 실행 순간을 한 번만 기록
  const launchTime = useRef(toLaunchDate(new Date())).current;

  const { stocks, asOfDate, loading, error, cached, refresh } = useVolatility(launchTime);

  useEffect(() => {
    refresh();
  }, []);

  const formattedDate = asOfDate
    ? `${asOfDate.slice(0, 4)}.${asOfDate.slice(4, 6)}.${asOfDate.slice(6, 8)}`
    : "";

  const Header = (
    <View style={styles.header}>
      <Text style={styles.title}>KOSPI 변동성 TOP 10</Text>
      <Text style={styles.subtitle}>최근 3개월 일별 수익률 표준편차 기준</Text>
      {formattedDate ? (
        <Text style={styles.dateText}>
          기준일: {formattedDate} (앱 실행 시점){cached ? " · 캐시됨" : ""}
        </Text>
      ) : null}
      <Text style={styles.hint}>종목 탭 → 3개월 뉴스 보기</Text>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>아래로 당겨 재시도</Text>
        </View>
      ) : null}
      {loading && stocks.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#FF9F0A" size="small" style={{ marginRight: 8 }} />
          <Text style={styles.loadingText}>전체 KOSPI 데이터 수집 중... (약 1~2분 소요)</Text>
        </View>
      ) : null}
    </View>
  );

  if (loading && stocks.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        {Header}
        {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <FlatList
        data={stocks}
        keyExtractor={(item: StockItem) => item.ticker}
        renderItem={({ item }) => <StockCard item={item} launchTime={launchTime} />}
        ListHeaderComponent={Header}
        ListFooterComponent={<View style={{ height: 32 }} />}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
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
});
