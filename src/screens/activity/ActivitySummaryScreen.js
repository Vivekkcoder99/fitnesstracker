import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { theme } from "../../theme";
import PrimaryButton from "../../components/PrimaryButton";

/* ─── Helpers ─────────────────────────────────────────────── */
const formatPace = (paceMinPerKm) => {
  if (!paceMinPerKm || paceMinPerKm <= 0) return "–:––";
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const formatActiveTime = (seconds = 0) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const getWorkoutLabel = (activityType, workoutType) => {
  // activityType takes priority — always show Walk/Cycle correctly
  if (activityType === "walk") return "Walk";
  if (activityType === "cycle") return "Cycle";
  // For runs, use the workout sub-type
  if (workoutType === "tempo") return "Tempo Run";
  if (workoutType === "long")  return "Long Run";
  if (workoutType === "free")  return "Free Run";
  return "Easy Run";
};

/* ─── PR Detection ─────────────────────────────────────────── */
// A simple badge: show if this run's pace is better than a stored best_pace field
// For now we show a badge if pace is under a threshold for the distance
const detectPRBadge = (activity) => {
  const dist = activity.distanceMeters || 0;
  const pace = activity.paceMinPerKm || 0;
  if (dist <= 0 || pace <= 0) return null;

  const distKm = dist / 1000;
  if (distKm >= 4.8 && distKm <= 5.2 && pace < 5.5) return "🏅 PR — Best 5K";
  if (distKm >= 9.7 && distKm <= 10.3 && pace < 5.5) return "🏅 PR — Best 10K";
  return null;
};

/* ─── Splits Table ─────────────────────────────────────────── */
const SplitsTable = ({ paceSeriesMinPerKm }) => {
  if (!paceSeriesMinPerKm || paceSeriesMinPerKm.length === 0) return null;
  const maxPace = Math.max(...paceSeriesMinPerKm, 0.001);

  return (
    <View style={splitStyles.wrap}>
      {paceSeriesMinPerKm.slice(0, 8).map((pace, i) => {
        const fillPct = Math.round((pace / maxPace) * 100);
        return (
          <View key={i} style={splitStyles.row}>
            <Text style={splitStyles.num}>{i + 1}</Text>
            <View style={splitStyles.barWrap}>
              <View style={[splitStyles.barFill, { width: `${fillPct}%` }]} />
            </View>
            <Text style={splitStyles.pace}>{formatPace(pace)}</Text>
          </View>
        );
      })}
    </View>
  );
};

const splitStyles = StyleSheet.create({
  wrap: { gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  num: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 10,
    color: theme.colors.text.tertiary,
    width: 18,
  },
  barWrap: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  pace: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 11,
    color: theme.colors.text.primary,
    fontWeight: "600",
    width: 36,
    textAlign: "right",
  },
});

/* ─── ActivitySummaryScreen ───────────────────────────────── */
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

  const distKm = (activity.distanceMeters || 0) / 1000;
  const prBadge = detectPRBadge(activity);
  const label = getWorkoutLabel(activity.activityType, activity.workoutType);

  const stats = [
    {
      label: "Avg Pace",
      value: formatPace(activity.paceMinPerKm || activity.smoothedPaceMinPerKm),
      color: theme.colors.primary,
    },
    {
      label: "Active Time",
      value: formatActiveTime(activity.activeTimeSeconds || activity.durationSeconds),
      color: theme.colors.text.primary,
    },
    {
      label: "Elevation",
      value: activity.elevationGain ? `${Math.round(activity.elevationGain)} m` : "–",
      color: theme.colors.text.primary,
    },
    {
      label: "Calories",
      value: activity.calories
        ? `${Math.round(activity.calories)}`
        : Math.round((activity.activeTimeSeconds || 0) / 60 * 8).toString(),
      color: theme.colors.text.primary,
    },
    {
      label: "Elapsed",
      value: formatActiveTime(activity.elapsedTimeSeconds || activity.durationSeconds),
      color: theme.colors.text.primary,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Hero ───────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{label} Complete</Text>
          <Text style={styles.heroDist}>
            {distKm.toFixed(2)}
            <Text style={styles.heroUnit}> km</Text>
          </Text>
          {prBadge && (
            <View style={styles.prBadge}>
              <Text style={styles.prBadgeText}>{prBadge}</Text>
            </View>
          )}
        </View>

        {/* ── 6-Cell Stat Grid ───────────────────────────── */}
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={s.label} style={[styles.statCell, i % 2 === 1 && styles.statCellRight]}>
              <Text style={styles.statCellLabel}>{s.label.toUpperCase()}</Text>
              <Text style={[styles.statCellVal, { color: s.color }]}>{s.value}</Text>
            </View>
          ))}
        </View>


        {/* ── Actions ────────────────────────────────────── */}
        <View style={styles.actions}>
          <PrimaryButton
            title="Back to Home"
            onPress={() => navigation.navigate("Home")}
          />
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("MainTabs", { screen: "History" })}
          >
            <Text style={styles.secondaryBtnText}>View All Runs →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingBottom: theme.spacing.xxl,
    gap: 1, // tight grid seam
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },

  /* Hero section */
  hero: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    padding: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
    gap: 6,
  },
  heroTitle: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  heroDist: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 60,
    fontWeight: "700",
    color: theme.colors.text.primary,
    letterSpacing: -3,
    lineHeight: 64,
  },
  heroUnit: {
    fontSize: 16,
    color: theme.colors.text.tertiary,
    fontFamily: theme.typography.mono.fontFamily,
  },
  prBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: "rgba(197,241,53,0.3)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 6,
  },
  prBadgeText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: "700",
    fontFamily: theme.typography.mono.fontFamily,
    letterSpacing: 0.5,
  },

  /* 6-cell grid */
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 1,
    backgroundColor: theme.colors.border,
  },
  statCell: {
    width: "49.9%",
    backgroundColor: theme.colors.background,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    gap: 4,
  },
  statCellRight: { alignItems: "flex-start" },
  statCellLabel: {
    fontSize: 9,
    color: theme.colors.text.tertiary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  statCellVal: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },

  /* Splits card */
  card: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.text.secondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  /* Actions */
  actions: {
    margin: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  secondaryBtnText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "600",
  },

  errorText: { ...theme.typography.body, color: theme.colors.danger },
});

export default ActivitySummaryScreen;
