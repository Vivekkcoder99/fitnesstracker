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
const formatDate = (ts) =>
  ts
  ? new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
  : "–";

const formatDistance = (m = 0) => `${(m / 1000).toFixed(2)} km`;

const formatDuration = (s = 0) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m < 1 ? `${sec}s` : `${m}m ${sec}s`;
};

const formatPace = (paceMinPerKm) => {
  if (!paceMinPerKm || paceMinPerKm <= 0) return "–:––";
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/* ─── Calendar Heatmap ────────────────────────────────────── */
function CalendarHeatmap({ activities, year, month }) {
  // Build a map of { "YYYY-MM-DD" => totalKm }
  const dayMap = useMemo(() => {
    const map = {};
    activities.forEach((a) => {
      const ts = a.startedAt || a.createdAt;
      if (!ts) return;
      const d = new Date(ts);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        map[key] = (map[key] || 0) + (a.distanceMeters || 0) / 1000;
      }
    });
    return map;
  }, [activities, year, month]);

  const maxKm = useMemo(() => Math.max(1, ...Object.values(dayMap)), [dayMap]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  // Monday-indexed: 0=Mon … 6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ d, key, km: dayMap[key] || 0 });
  }
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={cal.wrap}>
      {/* Day of week header */}
      <View style={cal.header}>
        {DAYS.map((day, i) => (
          <Text key={i} style={cal.dayLabel}>{day}</Text>
        ))}
      </View>

      {/* Weeks */}
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={cal.row}>
          {cells.slice(row * 7, row * 7 + 7).map((cell, col) => {
            if (!cell) return <View key={col} style={cal.cell} />;
            const isToday = cell.key === todayKey;
            // 3-level intensity per mockup: <5km dim, 5-12km mid, 12km+ full
            let bgColor = "transparent";
            let textColor = "rgba(255,255,255,0.3)";
            if (cell.km >= 12) {
              bgColor = "#C5F135";
              textColor = "#0C0D11";
            } else if (cell.km >= 5) {
              bgColor = "rgba(197,241,53,0.5)";
              textColor = "#C5F135";
            } else if (cell.km > 0) {
              bgColor = "rgba(197,241,53,0.25)";
              textColor = "#8BAF22";
            }
            return (
              <View
                key={col}
                style={[
                  cal.cell,
                  { backgroundColor: bgColor },
                  isToday && cal.cellToday,
                ]}
              >
                <Text style={[cal.cellNum, { color: textColor }]}>
                  {cell.d}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const cal = StyleSheet.create({
  wrap: { gap: 3 },
  header: { flexDirection: "row", marginBottom: 2 },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 8,
    fontWeight: "600",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", gap: 3 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  cellToday: {
    borderWidth: 1,
    borderColor: "#C5F135",
  },
  cellNum: {
    fontSize: 8,
    fontFamily: theme.typography.mono.fontFamily,
    fontWeight: "700",
  },
});

/* ─── HistoryScreen ───────────────────────────────────────── */
const HistoryScreen = ({ navigation }) => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

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

  /* Month totals */
  const monthTotals = useMemo(() => {
    return activities.reduce(
      (acc, a) => {
        const ts = a.startedAt || a.createdAt;
        if (!ts) return acc;
        const d = new Date(ts);
        if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) return acc;
        return {
          distanceMeters: acc.distanceMeters + (a.distanceMeters || 0),
          durationSeconds: acc.durationSeconds + (a.durationSeconds || 0),
          count: acc.count + 1,
        };
      },
      { distanceMeters: 0, durationSeconds: 0, count: 0 }
    );
  }, [activities, viewYear, viewMonth]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" }
  );

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    const n = new Date();
    if (viewYear === n.getFullYear() && viewMonth === n.getMonth()) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => load({ refreshing: true })} tintColor={theme.colors.primary} />
        }
      >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>History</Text>
        <Text style={styles.pageSubtitle}>Your activity calendar</Text>
      </View>

      {/* Month nav */}
      <View style={styles.monthNav}>
        <Pressable onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>›</Text>
        </Pressable>
      </View>

      {/* Month totals */}
      <View style={styles.monthTotals}>
        <View style={styles.totalItem}>
          <Text style={styles.totalValue}>{formatDistance(monthTotals.distanceMeters)}</Text>
          <Text style={styles.totalLabel}>Distance</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={styles.totalValue}>{monthTotals.count}</Text>
          <Text style={styles.totalLabel}>Runs</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={styles.totalValue}>{formatDuration(monthTotals.durationSeconds)}</Text>
          <Text style={styles.totalLabel}>Time</Text>
        </View>
      </View>

      {/* Heatmap Calendar */}
      <View style={styles.calendarCard}>
        <Text style={styles.sectionLabel}>Activity Heatmap</Text>
        <CalendarHeatmap activities={activities} year={viewYear} month={viewMonth} />

        {/* Legend — 3 levels per mockup */}
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: "rgba(197,241,53,0.25)" }]} />
          <Text style={styles.legendText}>Short (&lt;5km)</Text>
          <View style={[styles.legendDot, { backgroundColor: "rgba(197,241,53,0.5)" }]} />
          <Text style={styles.legendText}>Med (5–12)</Text>
          <View style={[styles.legendDot, { backgroundColor: "#C5F135" }]} />
          <Text style={styles.legendText}>Long (12+)</Text>
        </View>
      </View>

      {/* Recent runs list */}
      <View style={styles.listSection}>
        <Text style={styles.sectionLabel}>
          {new Date(viewYear, viewMonth).toLocaleString("default", { month: "long" })} Runs
        </Text>
        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : activities.length === 0 ? (
          <Text style={styles.emptyText}>No activities yet.</Text>
        ) : (
          activities
            .filter((a) => {
              const ts = a.startedAt || a.createdAt;
              if (!ts) return false;
              const d = new Date(ts);
              return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
            })
            .slice(0, 20)
            .map((a) => {
              const wt = a.workoutType || a.activityType;
              const dotColor =
                wt === "tempo" ? theme.colors.secondary
                : wt === "long" ? theme.colors.accent
                : theme.colors.primary; // default lime = easy/free/walk/run
              const ts = a.startedAt || a.createdAt;
              const timeStr = ts
                ? new Date(ts).toLocaleString(undefined, {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";
              const pace = a.paceMinPerKm ? formatPace(a.paceMinPerKm) : "–";
              const km = ((a.distanceMeters || 0) / 1000).toFixed(1);
              const label =
                wt === "easy"  ? "Easy Run"
                : wt === "tempo" ? "Tempo Run"
                : wt === "long"  ? "Long Run"
                : wt === "free"  ? "Free Run"
                : wt === "walk"  ? "Walk"
                : wt === "cycle" ? "Cycle"
                : "Run";
              return (
                <Pressable
                  key={a.id}
                  style={({ pressed }) => [histStyles.item, pressed && { opacity: 0.7 }]}
                  onPress={() => navigation.navigate("ActivityDetail", { activity: a })}
                >
                  <View style={[histStyles.dot, { backgroundColor: dotColor }]} />
                  <View style={histStyles.info}>
                    <Text style={histStyles.type}>{label}</Text>
                    <Text style={histStyles.date}>{timeStr}</Text>
                  </View>
                  <View style={histStyles.stats}>
                    <Text style={histStyles.dist}>{km} km</Text>
                    <Text style={histStyles.pace}>{pace} /km</Text>
                  </View>
                </Pressable>
              );
            })
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingTop: theme.spacing.xl, gap: theme.spacing.lg },
  header: { gap: 4 },
  pageTitle: { ...theme.typography.h1, fontSize: 32 },
  pageSubtitle: { ...theme.typography.body, color: theme.colors.text.secondary },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    width: 36,
    alignItems: "center",
  },
  navBtnText: { color: theme.colors.text.primary, fontSize: 18, lineHeight: 20 },
  monthLabel: { ...theme.typography.h3, fontSize: 16, letterSpacing: -0.2 },

  monthTotals: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    ...theme.shadows.card,
  },
  totalItem: {
    flex: 1,
    alignItems: "center",
    padding: theme.spacing.md,
    gap: 2,
  },
  totalValue: {
    ...theme.typography.mono,
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  totalLabel: {
    ...theme.typography.caption,
    fontSize: 9,
  },
  totalDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },

  calendarCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.card,
    gap: theme.spacing.md,
  },
  sectionLabel: {
    ...theme.typography.caption,
    letterSpacing: 2,
    marginBottom: 4,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
    marginTop: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: theme.borderRadius.full,
  },
  legendText: {
    ...theme.typography.caption,
    fontSize: 9,
    letterSpacing: 0.5,
  },

  listSection: { gap: 0 },

  emptyText: { ...theme.typography.body, color: theme.colors.text.tertiary, textAlign: "center", marginTop: theme.spacing.xl },
});

const histStyles = StyleSheet.create({
  item: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
    marginTop: 2,
  },
  info: { flex: 1 },
  type: { fontSize: 11, fontWeight: "500", color: theme.colors.text.primary },
  date: {
    fontSize: 9,
    color: theme.colors.text.tertiary,
    fontFamily: theme.typography.mono.fontFamily,
    marginTop: 2,
  },
  stats: { alignItems: "flex-end" },
  dist: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  pace: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 9,
    color: theme.colors.text.tertiary,
  },
});

export default HistoryScreen;
