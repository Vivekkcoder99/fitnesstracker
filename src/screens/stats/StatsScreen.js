import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { auth } from "../../config/firebase";
import { getUserActivities } from "../../services/activityService";
import { theme } from "../../theme";

/* ─── Helpers ─────────────────────────────────────────────── */
const formatPace = (paceMinPerKm) => {
  if (!paceMinPerKm || paceMinPerKm <= 0) return "–:––";
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const getMondayOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/* ─── Time Range Definitions ──────────────────────────────── */
const TIME_RANGES = [
  { label: "4W",  weeks: 4 },
  { label: "3M",  weeks: 13 },
  { label: "6M",  weeks: 26 },
  { label: "1Y",  weeks: 52 },
];

/* ─── Sparkline Chart ─────────────────────────────────────── */
function SparkLine({ data, width = 220, height = 40 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 0.001);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const fillPts = `0,${height} ${pts} ${width},${height}`;

  return (
    <View style={{ height, width: "100%" }}>
      {/* We use a native SVG-like approach with a View-based chart */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
        {data.map((v, i) => {
          const pct = max > 0 ? ((v - min) / range) : 0;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(4, pct * 100)}%`,
                backgroundColor: `rgba(197,241,53,${0.15 + pct * 0.5})`,
                borderRadius: 2,
                borderTopWidth: 1.5,
                borderTopColor: theme.colors.primary,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

/* ─── Zone Distribution ───────────────────────────────────── */
const ZONE_DEFS = [
  { key: "z1", label: "Z1", name: "Easy",   color: theme.colors.z1 },
  { key: "z2", label: "Z2", name: "Base",   color: theme.colors.z2 },
  { key: "z3", label: "Z3", name: "Tempo",  color: theme.colors.z3 },
  { key: "z4", label: "Z4", name: "Hard",   color: theme.colors.z4 },
  { key: "z5", label: "Z5", name: "Max",    color: theme.colors.z5 },
];

const getPaceZoneIdx = (paceMinPerKm) => {
  if (!paceMinPerKm || paceMinPerKm <= 0) return -1;
  if (paceMinPerKm > 7.5) return 0; // Z1
  if (paceMinPerKm > 6.0) return 1; // Z2
  if (paceMinPerKm > 5.0) return 2; // Z3
  if (paceMinPerKm > 4.0) return 3; // Z4
  return 4;                          // Z5
};

function ZoneDistribution({ activities }) {
  const counts = useMemo(() => {
    const c = [0, 0, 0, 0, 0];
    activities.forEach((a) => {
      const idx = getPaceZoneIdx(a.paceMinPerKm);
      if (idx >= 0) c[idx]++;
    });
    return c;
  }, [activities]);

  const total = counts.reduce((s, c) => s + c, 0) || 1;

  return (
    <View style={zoneStyles.wrap}>
      {ZONE_DEFS.map((z, i) => {
        const pct = Math.round((counts[i] / total) * 100);
        return (
          <View key={z.key} style={zoneStyles.row}>
            <Text style={[zoneStyles.zoneLabel, { color: z.color }]}>{z.label}</Text>
            <View style={zoneStyles.barBg}>
              <View
                style={[
                  zoneStyles.barFill,
                  { width: `${pct}%`, backgroundColor: z.color },
                ]}
              />
            </View>
            <Text style={zoneStyles.pct}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
}

const zoneStyles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  zoneLabel: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 9,
    fontWeight: "700",
    width: 22,
    letterSpacing: 0.5,
  },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
  pct: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 9,
    color: theme.colors.text.tertiary,
    width: 28,
    textAlign: "right",
  },
});

/* ─── Personal Records ────────────────────────────────────── */
function PRCards({ activities }) {
  const prs = useMemo(() => {
    const runs = activities.filter((a) => a.activityType === "run" && a.distanceMeters >= 4800);
    const fiveK = runs
      .filter((a) => a.distanceMeters >= 4800 && a.distanceMeters <= 5200)
      .sort((a, b) => (a.paceMinPerKm || 99) - (b.paceMinPerKm || 99))[0];
    const tenK = runs
      .filter((a) => a.distanceMeters >= 9700 && a.distanceMeters <= 10300)
      .sort((a, b) => (a.paceMinPerKm || 99) - (b.paceMinPerKm || 99))[0];
    const longest = [...activities].sort((a, b) => (b.distanceMeters || 0) - (a.distanceMeters || 0))[0];
    const fastest = [...activities]
      .filter((a) => (a.paceMinPerKm || 0) > 0)
      .sort((a, b) => (a.paceMinPerKm || 99) - (b.paceMinPerKm || 99))[0];

    return [
      { label: "5K PACE",  value: fiveK   ? formatPace(fiveK.paceMinPerKm)   : "–" },
      { label: "10K PACE", value: tenK    ? formatPace(tenK.paceMinPerKm)    : "–" },
      { label: "LONGEST",  value: longest ? `${(longest.distanceMeters / 1000).toFixed(1)}km` : "–" },
      { label: "BEST",     value: fastest ? formatPace(fastest.paceMinPerKm) : "–" },
    ];
  }, [activities]);

  return (
    <View style={prStyles.grid}>
      {prs.map((p) => (
        <View key={p.label} style={prStyles.card}>
          <Text style={prStyles.label}>{p.label}</Text>
          <Text style={prStyles.value}>{p.value}</Text>
        </View>
      ))}
    </View>
  );
}

const prStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 1,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    overflow: "hidden",
  },
  card: {
    width: "49.9%",
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: 6,
  },
  label: { ...theme.typography.caption, fontSize: 8, letterSpacing: 2 },
  value: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
});

/* ─── Delta Badge ─────────────────────────────────────────── */
const DeltaBadge = ({ delta, invert = false }) => {
  if (delta === null || delta === undefined) return null;
  const positive = invert ? delta < 0 : delta > 0;
  return (
    <View style={[deltaStyles.badge, positive ? deltaStyles.good : deltaStyles.bad]}>
      <Text style={[deltaStyles.text, positive ? deltaStyles.goodText : deltaStyles.badText]}>
        {delta > 0 ? "↑ +" : "↓ "}{Math.abs(delta).toFixed(1)}
      </Text>
    </View>
  );
};

const deltaStyles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    marginLeft: 8,
  },
  good: { backgroundColor: theme.colors.primaryLight },
  bad: { backgroundColor: "rgba(239,68,68,0.15)" },
  text: { fontFamily: theme.typography.mono.fontFamily, fontSize: 10, fontWeight: "700" },
  goodText: { color: theme.colors.primary },
  badText: { color: theme.colors.danger },
});

/* ─── StatsScreen ─────────────────────────────────────────── */
const StatsScreen = () => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rangeIdx, setRangeIdx] = useState(0);

  const load = useCallback(async ({ refreshing = false } = {}) => {
    const userId = auth?.currentUser?.uid;
    if (!userId) { setIsLoading(false); return; }
    try {
      if (refreshing) setIsRefreshing(true); else setIsLoading(true);
      const data = await getUserActivities(userId);
      setActivities(data);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { weeks: rangeWeeks } = TIME_RANGES[rangeIdx];

  /* Activities in range */
  const rangedActivities = useMemo(() => {
    const cutoff = Date.now() - rangeWeeks * 7 * 86400000;
    return activities.filter((a) => (a.startedAt || a.createdAt || 0) >= cutoff);
  }, [activities, rangeWeeks]);

  /* Weekly volume data for sparkline */
  const weeklyVolumes = useMemo(() => {
    const now = new Date();
    const result = [];
    for (let w = rangeWeeks - 1; w >= 0; w--) {
      const monday = getMondayOfWeek(new Date(now.getTime() - w * 7 * 86400000));
      const sunday = new Date(monday.getTime() + 6 * 86400000);
      sunday.setHours(23, 59, 59, 999);
      const total = rangedActivities
        .filter((a) => {
          const ts = a.startedAt || a.createdAt || 0;
          return ts >= monday.getTime() && ts <= sunday.getTime();
        })
        .reduce((sum, a) => sum + (a.distanceMeters || 0) / 1000, 0);
      result.push(total);
    }
    return result.slice(-Math.min(rangeWeeks, 12)); // Show at most last 12 weeks for readability
  }, [rangedActivities, rangeWeeks]);

  /* Totals */
  const totalKm = rangedActivities.reduce((s, a) => s + (a.distanceMeters || 0) / 1000, 0);
  const avgPace = useMemo(() => {
    const paced = rangedActivities.filter((a) => a.paceMinPerKm > 0);
    if (!paced.length) return null;
    return paced.reduce((s, a) => s + a.paceMinPerKm, 0) / paced.length;
  }, [rangedActivities]);

  /* Delta: compare latest half vs older half of range */
  const volumeDelta = useMemo(() => {
    if (weeklyVolumes.length < 2) return null;
    const half = Math.floor(weeklyVolumes.length / 2);
    const older = weeklyVolumes.slice(0, half);
    const newer = weeklyVolumes.slice(half);
    const avgOld = older.reduce((s, v) => s + v, 0) / (older.length || 1);
    const avgNew = newer.reduce((s, v) => s + v, 0) / (newer.length || 1);
    return avgNew - avgOld;
  }, [weeklyVolumes]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => load({ refreshing: true })}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Trends</Text>
        </View>

        {/* Time Range Chips */}
        <View style={styles.rangeRow}>
          {TIME_RANGES.map((r, i) => (
            <Pressable
              key={r.label}
              onPress={() => setRangeIdx(i)}
              style={[styles.rangeChip, rangeIdx === i && styles.rangeChipActive]}
            >
              <Text style={[styles.rangeLabel, rangeIdx === i && styles.rangeLabelActive]}>
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <>
            {/* Weekly Volume Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>WEEKLY VOLUME</Text>
              <View style={styles.metaRow}>
                <Text style={styles.bigVal}>{totalKm.toFixed(1)}</Text>
                <Text style={styles.bigUnit}> km</Text>
                <DeltaBadge delta={volumeDelta} />
              </View>
              <SparkLine data={weeklyVolumes} height={44} />
            </View>

            {/* Avg Pace Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>AVG PACE</Text>
              <View style={styles.metaRow}>
                <Text style={styles.bigVal}>{formatPace(avgPace)}</Text>
                <Text style={styles.bigUnit}> /km</Text>
              </View>
              <SparkLine
                data={rangedActivities.map((a) => a.paceMinPerKm || 0).filter(Boolean)}
                height={44}
              />
            </View>

            {/* Pace Zone Distribution */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>PACE ZONE DISTRIBUTION</Text>
              <ZoneDistribution activities={rangedActivities} />
            </View>

            {/* Personal Records */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PERSONAL RECORDS</Text>
              <PRCards activities={activities} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  header: { paddingBottom: 4 },
  pageTitle: { ...theme.typography.h1 },

  rangeRow: { flexDirection: "row", gap: 6 },
  rangeChip: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.borderRadius.xs,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  rangeChipActive: { backgroundColor: theme.colors.primary },
  rangeLabel: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.text.secondary,
  },
  rangeLabelActive: { color: theme.colors.text.inverse },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: 10,
    ...theme.shadows.card,
  },
  cardLabel: { ...theme.typography.caption, color: theme.colors.text.tertiary, letterSpacing: 1.5 },
  metaRow: { flexDirection: "row", alignItems: "baseline" },
  bigVal: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text.primary,
    letterSpacing: -1,
  },
  bigUnit: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 13,
    color: theme.colors.text.tertiary,
  },

  section: { gap: theme.spacing.sm },
  sectionLabel: { ...theme.typography.caption, letterSpacing: 2 },
});

export default StatsScreen;
