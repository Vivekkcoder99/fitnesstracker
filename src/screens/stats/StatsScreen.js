import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
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
const formatDistance = (m = 0) => `${(m / 1000).toFixed(1)} km`;
const formatDuration = (s = 0) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const getMondayOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/* ─── 7-Week Bar Chart ────────────────────────────────────── */
function WeeklyBarChart({ activities }) {
  const weeks = useMemo(() => {
    const now = new Date();
    const result = [];
    for (let w = 6; w >= 0; w--) {
      const monday = getMondayOfWeek(new Date(now.getTime() - w * 7 * 86400000));
      const sunday = new Date(monday.getTime() + 6 * 86400000);
      sunday.setHours(23, 59, 59, 999);
      const label = monday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const shortLabel = monday.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
      const total = activities
        .filter((a) => {
          const ts = a.startedAt || a.createdAt || 0;
          return ts >= monday.getTime() && ts <= sunday.getTime();
        })
        .reduce((sum, a) => sum + (a.distanceMeters || 0) / 1000, 0);
      result.push({ label, shortLabel, total, isCurrent: w === 0 });
    }
    return result;
  }, [activities]);

  const maxKm = Math.max(1, ...weeks.map((w) => w.total));

  return (
    <View style={chart.wrap}>
      {weeks.map((w, i) => {
        const pct = w.total / maxKm;
        return (
          <View key={i} style={chart.col}>
            {w.total > 0 && (
              <Text style={chart.barVal}>{w.total.toFixed(1)}</Text>
            )}
            <View style={chart.barBg}>
              <View
                style={[
                  chart.barFill,
                  {
                    height: `${Math.max(4, pct * 100)}%`,
                    backgroundColor: w.isCurrent ? theme.colors.primary : "rgba(255,255,255,0.18)",
                  },
                ]}
              />
            </View>
            <Text style={[chart.barLabel, w.isCurrent && { color: theme.colors.primary }]}>
              {w.shortLabel}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const chart = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    gap: 6,
    paddingTop: 20,
  },
  col: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
    gap: 4,
  },
  barBg: {
    width: "100%",
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 2,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 2,
  },
  barVal: {
    position: "absolute",
    top: -18,
    fontSize: 8,
    color: theme.colors.primary,
    fontFamily: "monospace",
    textAlign: "center",
  },
  barLabel: {
    fontSize: 8,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
});

const ZONES = [
  { label: "Recovery", color: theme.colors.primaryDark, range: [0, 6] },
  { label: "Easy", color: theme.colors.success, range: [6, 7] },
  { label: "Tempo", color: theme.colors.primary, range: [7, 9] },
  { label: "Threshold", color: theme.colors.warning, range: [9, 12] },
  { label: "VO₂ Max", color: theme.colors.secondary, range: [12, 99] },
];

function ZoneBar({ activities }) {
  const zoneCounts = useMemo(() => {
    const counts = new Array(ZONES.length).fill(0);
    activities.forEach((a) => {
      const pace = a.paceMinPerKm || 0;
      if (pace <= 0) return;
      const idx = ZONES.findIndex((z) => pace >= z.range[0] && pace < z.range[1]);
      if (idx >= 0) counts[idx]++;
    });
    return counts;
  }, [activities]);

  const total = zoneCounts.reduce((s, c) => s + c, 0) || 1;

  return (
    <View style={zones.wrap}>
      <View style={zones.bar}>
        {ZONES.map((z, i) =>
          zoneCounts[i] > 0 ? (
            <View
              key={i}
              style={[zones.segment, { flex: zoneCounts[i], backgroundColor: z.color }]}
            />
          ) : null
        )}
      </View>
      <View style={zones.legend}>
        {ZONES.map((z, i) => (
          <View key={i} style={zones.legendItem}>
            <View style={[zones.dot, { backgroundColor: z.color }]} />
            <Text style={zones.legendLabel}>{z.label}</Text>
            <Text style={zones.legendPct}>
              {Math.round((zoneCounts[i] / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const zones = StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  bar: {
    height: 10,
    flexDirection: "row",
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  segment: { height: "100%" },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: "45%",
  },
  dot: { width: 6, height: 6, borderRadius: 1 },
  legendLabel: {
    flex: 1,
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },
  legendPct: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
  },
});

/* ─── PR Cards ────────────────────────────────────────────── */
function PRCards({ activities }) {
  const prs = useMemo(() => {
    const runs = activities.filter(
      (a) => a.activityType === "run" && a.distanceMeters >= 4800
    );
    const fiveK = runs
      .filter((a) => a.distanceMeters >= 4800 && a.distanceMeters <= 5200)
      .sort((a, b) => (a.paceMinPerKm || 99) - (b.paceMinPerKm || 99))[0];
    const tenK = runs
      .filter((a) => a.distanceMeters >= 9700 && a.distanceMeters <= 10300)
      .sort((a, b) => (a.paceMinPerKm || 99) - (b.paceMinPerKm || 99))[0];
    const longest = [...activities].sort(
      (a, b) => (b.distanceMeters || 0) - (a.distanceMeters || 0)
    )[0];
    const fastest = [...activities]
      .filter((a) => (a.paceMinPerKm || 0) > 0)
      .sort((a, b) => (a.paceMinPerKm || 99) - (b.paceMinPerKm || 99))[0];

    return [
      { label: "5K Pace", value: fiveK ? `${fiveK.paceMinPerKm?.toFixed(2)} /km` : "–" },
      { label: "10K Pace", value: tenK ? `${tenK.paceMinPerKm?.toFixed(2)} /km` : "–" },
      { label: "Longest", value: longest ? formatDistance(longest.distanceMeters) : "–" },
      { label: "Best Pace", value: fastest ? `${fastest.paceMinPerKm?.toFixed(2)} /km` : "–" },
    ];
  }, [activities]);

  return (
    <View style={pr.grid}>
      {prs.map((p) => (
        <View key={p.label} style={pr.card}>
          <Text style={pr.cardLabel}>{p.label}</Text>
          <Text style={pr.cardValue}>{p.value}</Text>
        </View>
      ))}
    </View>
  );
}

const pr = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 1, backgroundColor: theme.colors.border, borderRadius: theme.borderRadius.sm, overflow: "hidden" },
  card: { width: "49.9%", backgroundColor: theme.colors.surface, padding: theme.spacing.md, gap: 6 },
  cardLabel: { ...theme.typography.caption, fontSize: 9, letterSpacing: 2 },
  cardValue: { fontFamily: "monospace", fontSize: 22, fontWeight: "600", color: theme.colors.text.primary },
});

/* ─── Stat Tabs ───────────────────────────────────────────── */
const TABS = ["Distance", "Pace", "Duration"];

/* ─── StatsScreen ─────────────────────────────────────────── */
const StatsScreen = () => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

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

  /* All-time totals */
  const totals = useMemo(() => {
    return activities.reduce(
      (acc, a) => ({
        distance: acc.distance + (a.distanceMeters || 0) / 1000,
        duration: acc.duration + (a.durationSeconds || 0),
        count: acc.count + 1,
      }),
      { distance: 0, duration: 0, count: 0 }
    );
  }, [activities]);

  const avgPace = useMemo(() => {
    const paced = activities.filter((a) => a.paceMinPerKm > 0);
    if (!paced.length) return null;
    return paced.reduce((s, a) => s + a.paceMinPerKm, 0) / paced.length;
  }, [activities]);

  return (
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
        <Text style={styles.pageSubtitle}>Performance over time</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <>
          {/* All-time hero stats */}
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroValue}>{totals.distance.toFixed(1)}</Text>
              <Text style={styles.heroUnit}>total km</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroValue}>{totals.count}</Text>
              <Text style={styles.heroUnit}>activities</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroValue, { color: theme.colors.primary }]}>
                {avgPace ? avgPace.toFixed(2) : "–"}
              </Text>
              <Text style={styles.heroUnit}>avg pace</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            {TABS.map((tab, i) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(i)}
                style={[styles.tab, activeTab === i && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Weekly Bar Chart */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekly {TABS[activeTab]}</Text>
            <Text style={styles.cardSubtitle}>Last 7 weeks · km</Text>
            <WeeklyBarChart activities={activities} />
          </View>

          {/* Pace Zones */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pace Distribution</Text>
            <Text style={styles.cardSubtitle}>Time in zone by pace</Text>
            <ZoneBar activities={activities} />
          </View>

          {/* Personal Records */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Personal Records</Text>
            <PRCards activities={activities} />
          </View>

          {/* Activity type breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Activity Breakdown</Text>
            <Text style={styles.cardSubtitle}>By type</Text>
            <ActivityBreakdown activities={activities} />
          </View>
        </>
      )}
    </ScrollView>
  );
};

/* ─── Activity Breakdown ──────────────────────────────────── */
function ActivityBreakdown({ activities }) {
  const breakdown = useMemo(() => {
    const map = {};
    activities.forEach((a) => {
      const type = a.activityType || "other";
      if (!map[type]) map[type] = { count: 0, km: 0 };
      map[type].count++;
      map[type].km += (a.distanceMeters || 0) / 1000;
    });
    return Object.entries(map).sort((a, b) => b[1].km - a[1].km);
  }, [activities]);

  const totalKm = breakdown.reduce((s, [, v]) => s + v.km, 0) || 1;
  const typeColor = { run: theme.colors.primary, walk: theme.colors.secondary, cycle: theme.colors.accent };

  return (
    <View style={bd.wrap}>
      {breakdown.map(([type, stats]) => (
        <View key={type} style={bd.row}>
          <Text style={bd.type}>{type.toUpperCase()}</Text>
          <View style={bd.barBg}>
            <View
              style={[
                bd.barFill,
                {
                  width: `${(stats.km / totalKm) * 100}%`,
                  backgroundColor: typeColor[type] || "rgba(255,255,255,0.3)",
                },
              ]}
            />
          </View>
          <Text style={bd.km}>{stats.km.toFixed(1)} km</Text>
          <Text style={bd.count}>{stats.count}×</Text>
        </View>
      ))}
    </View>
  );
}

const bd = StyleSheet.create({
  wrap: { gap: 12, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  type: { fontSize: 9, fontWeight: "700", letterSpacing: 1, color: "rgba(255,255,255,0.5)", width: 44 },
  barBg: { flex: 1, height: 6, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },
  km: { fontFamily: "monospace", fontSize: 11, color: theme.colors.text.primary, width: 52, textAlign: "right" },
  count: { fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.4)", width: 24, textAlign: "right" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingTop: theme.spacing.xl, gap: theme.spacing.lg },
  header: { gap: 4 },
  pageTitle: { ...theme.typography.h1, fontSize: 32 },
  pageSubtitle: { ...theme.typography.body, color: theme.colors.text.secondary },

  heroRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    ...theme.shadows.card,
  },
  heroStat: { flex: 1, alignItems: "center", padding: theme.spacing.md, gap: 2 },
  heroValue: {
    fontFamily: "monospace",
    fontSize: 22,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  heroUnit: { ...theme.typography.caption, fontSize: 9, letterSpacing: 1 },
  heroDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.md },

  tabRow: {
    flexDirection: "row",
    gap: 1,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
  },
  tabActive: { backgroundColor: theme.colors.background },
  tabText: { ...theme.typography.caption, fontSize: 9, color: theme.colors.text.tertiary },
  tabTextActive: { color: theme.colors.primary },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: 6,
    ...theme.shadows.card,
  },
  cardTitle: { ...theme.typography.h3, fontSize: 15 },
  cardSubtitle: { ...theme.typography.caption, fontSize: 9, marginBottom: 8 },

  section: { gap: theme.spacing.sm },
  sectionLabel: { ...theme.typography.caption, letterSpacing: 2 },
});

export default StatsScreen;
