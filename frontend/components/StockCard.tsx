import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { StockItem } from "../hooks/useVolatility";

type Props = { item: StockItem; launchTime: string };

export function StockCard({ item, launchTime }: Props) {
  const router = useRouter();
  const positive = item.return_3m >= 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: "/news/[ticker]", params: { ticker: item.ticker, name: item.name, launchTime } })}
    >
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>#{item.rank}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.ticker}>{item.ticker}</Text>
      </View>

      <View style={styles.metrics}>
        <Text style={styles.volatility}>σ {item.volatility.toFixed(2)}%</Text>
        <Text style={[styles.returnRate, positive ? styles.up : styles.down]}>
          {positive ? "+" : ""}{item.return_3m.toFixed(1)}%
        </Text>
        <Text style={styles.price}>₩{item.current_price.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2C2C2E",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText:   { color: "#AEAEB2", fontSize: 13, fontWeight: "700" },
  info:       { flex: 1, marginRight: 8 },
  name:       { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  ticker:     { color: "#8E8E93", fontSize: 12, marginTop: 2 },
  metrics:    { alignItems: "flex-end" },
  volatility: { color: "#FF9F0A", fontSize: 14, fontWeight: "700" },
  returnRate: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  up:         { color: "#30D158" },
  down:       { color: "#FF453A" },
  price:      { color: "#8E8E93", fontSize: 12, marginTop: 2 },
});
