import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

export function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.circle} />
      <View style={styles.lines}>
        <View style={[styles.line, { width: "60%" }]} />
        <View style={[styles.line, { width: "30%", marginTop: 8 }]} />
      </View>
      <View style={styles.right}>
        <View style={[styles.line, { width: 60 }]} />
        <View style={[styles.line, { width: 40, marginTop: 8 }]} />
      </View>
    </Animated.View>
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
  },
  circle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#3A3A3C", marginRight: 12 },
  lines:  { flex: 1 },
  line:   { height: 12, backgroundColor: "#3A3A3C", borderRadius: 6 },
  right:  { alignItems: "flex-end" },
});
