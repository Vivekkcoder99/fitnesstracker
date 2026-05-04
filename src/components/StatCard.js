import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

const StatCard = ({ label, value, unit, highlight = false, style }) => {
  return (
    <View style={[styles.card, style]}>
      <Text style={[styles.value, highlight && styles.highlightValue]}>{value}</Text>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  value: {
    ...theme.typography.mono,
    fontSize: 28,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  highlightValue: {
    color: theme.colors.primary,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  label: {
    ...theme.typography.caption,
  },
  unit: {
    ...theme.typography.caption,
    textTransform: "lowercase",
  },
});

export default StatCard;
