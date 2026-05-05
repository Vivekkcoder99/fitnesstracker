import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

const StatCard = ({ label, value, unit, highlight = false, style }) => {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>{(label || "").toUpperCase()}</Text>
      <View style={styles.valRow}>
        <Text style={[styles.value, highlight && styles.highlightValue]}>
          {value}
        </Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontSize: 8,
    color: theme.colors.text.tertiary,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  valRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  value: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  highlightValue: {
    color: theme.colors.primary,
  },
  unit: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 10,
    color: theme.colors.text.tertiary,
    fontWeight: "500",
  },
});

export default StatCard;
