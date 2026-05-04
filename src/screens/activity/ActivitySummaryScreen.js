import React from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { theme } from "../../theme";
import { Ionicons } from "@expo/vector-icons";
import PrimaryButton from "../../components/PrimaryButton";

const ActivitySummaryScreen = ({ route, navigation }) => {
  const { activity } = route.params || {};

  if (!activity) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Activity not found.</Text>
        <PrimaryButton title="Go Home" onPress={() => navigation.navigate("Home")} />
      </View>
    );
  }

  const formatDistance = (meters = 0) => `${(meters / 1000).toFixed(2)} km`;
  const formatDuration = (seconds = 0) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return minutes < 1 ? `${remainingSeconds}s` : `${minutes}m ${remainingSeconds}s`;
  };
  const formatDateTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
          </View>
          <Text style={styles.congratsText}>Workout Complete!</Text>
          <Text style={styles.dateText}>{formatDateTime(activity.startedAt || activity.createdAt)}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.mainStat}>
            <Text style={styles.mainStatValue}>{formatDistance(activity.distanceMeters)}</Text>
            <Text style={styles.mainStatLabel}>Total Distance</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.secondaryStatsRow}>
            <View style={styles.secondaryStat}>
              <Text style={styles.secondaryStatValue}>{formatDuration(activity.durationSeconds)}</Text>
              <Text style={styles.secondaryStatLabel}>Total Time</Text>
            </View>
            <View style={styles.secondaryStat}>
              <Text style={styles.secondaryStatValue}>
                {(activity.paceMinPerKm || 0).toFixed(2)}
              </Text>
              <Text style={styles.secondaryStatLabel}>Avg Pace (/km)</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            title="Back to Home"
            onPress={() => navigation.navigate("Home")}
            style={styles.button}
          />
          <PrimaryButton
            title="View All Activities"
            icon="calendar"
            onPress={() => navigation.navigate("MainTabs", { screen: "History" })}
            style={[styles.button, styles.secondaryButton]}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    justifyContent: "center",
    gap: theme.spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  header: {
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 255, 170, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  congratsText: {
    ...theme.typography.h1,
    textAlign: "center",
    color: theme.colors.text.primary,
  },
  dateText: {
    ...theme.typography.body,
    color: theme.colors.text.tertiary,
    textAlign: "center",
  },
  statsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    ...theme.shadows.card,
    gap: theme.spacing.xl,
  },
  mainStat: {
    alignItems: "center",
  },
  mainStatValue: {
    ...theme.typography.mono,
    fontSize: 48,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  mainStatLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    width: "100%",
  },
  secondaryStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  secondaryStat: {
    alignItems: "center",
    gap: 4,
  },
  secondaryStatValue: {
    ...theme.typography.mono,
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  secondaryStatLabel: {
    ...theme.typography.caption,
    fontSize: 9,
    color: theme.colors.text.tertiary,
  },
  footer: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  button: {
    width: "100%",
    height: 56,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.danger,
  },
});

export default ActivitySummaryScreen;
