import React, { useEffect } from "react";
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNews, NewsArticle } from "../../hooks/useNews";

export default function NewsScreen() {
  const { ticker, name, launchTime } = useLocalSearchParams<{
    ticker: string;
    name: string;
    launchTime: string;
  }>();
  const router = useRouter();
  const { articles, startDate, endDate, loading, error, load } = useNews(ticker, launchTime);

  useEffect(() => {
    load();
  }, []);

  const Header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>‹ TOP 10</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.ticker}>{ticker}</Text>
      {startDate ? (
        <Text style={styles.range}>{startDate} ~ {endDate} 뉴스</Text>
      ) : null}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );

  const renderItem = ({ item, index }: { item: NewsArticle; index: number }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => Linking.openURL(item.url)}
    >
      <Text style={styles.newsDate}>{item.date}</Text>
      <Text style={styles.newsTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {Header}
        <View style={styles.center}>
          <ActivityIndicator color="#FF9F0A" size="large" />
          <Text style={styles.loadingText}>뉴스 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={articles}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>해당 기간 뉴스가 없습니다.</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 32 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#000000" },
  header:      { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  backBtn:     { marginBottom: 12 },
  backText:    { color: "#FF9F0A", fontSize: 17 },
  title:       { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  ticker:      { color: "#8E8E93", fontSize: 13, marginTop: 2 },
  range:       { color: "#636366", fontSize: 12, marginTop: 6 },
  errorBox:    { backgroundColor: "#2C1A1A", borderRadius: 10, padding: 12, marginTop: 10 },
  errorText:   { color: "#FF453A", fontSize: 13 },
  card: {
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 5,
    padding: 14,
  },
  newsDate:    { color: "#636366", fontSize: 11, marginBottom: 6 },
  newsTitle:   { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  loadingText: { color: "#8E8E93", marginTop: 12, fontSize: 14 },
  emptyText:   { color: "#636366", fontSize: 14 },
});
