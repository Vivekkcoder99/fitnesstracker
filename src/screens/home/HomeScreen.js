import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../config/firebase";
import { getUserActivities } from "../../services/activityService";
import { logout } from "../../services/authService";
import { getUserProfile } from "../../services/profileService";
import { theme } from "../../theme";

/* ─── Helpers ──────────────────────────────────────────────── */
const formatDistanceKm = (meters = 0) => (meters / 1000).toFixed(1);

const formatHours = (seconds = 0) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 1) return `${h}.${Math.floor(m / 6)}`;
  return `0.${Math.floor(m / 6)}`;
};

const formatPace = (paceMinPerKm = 0) => {
  if (!paceMinPerKm || paceMinPerKm <= 0) return "–";
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

const getActivityIcon = (type, workoutType) => {
  if (type === "cycle") return "🚴";
  if (type === "walk") return "🚶";
  if (workoutType === "long") return "🌅";
  if (workoutType === "tempo") return "⚡";
  if (workoutType === "easy") return "🏃";
  return "🏃";
};

const getWorkoutLabel = (type, workoutType) => {
  if (workoutType === "easy") return "Easy Run";
  if (workoutType === "tempo") return "Tempo Run";
  if (workoutType === "long") return "Long Run";
  if (workoutType === "free") return "Free Run";
  if (type === "walk") return "Walk";
  if (type === "cycle") return "Cycle";
  return "Run";
};

const getZoneFromPace = (paceMinPerKm) => {
  if (!paceMinPerKm || paceMinPerKm <= 0) return null;
  if (paceMinPerKm > 7.5) return "Z1";
  if (paceMinPerKm > 6.0) return "Z2";
  if (paceMinPerKm > 5.0) return "Z3";
  if (paceMinPerKm > 4.0) return "Z4";
  return "Z5";
};

const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

/* ─── Weekly Bar Chart ──────────────────────────────────────── */
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const getWeekStartTimestamp = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - diff);
  return weekStart.getTime();
};

const WeeklyBarChart = ({ activities, weekKm }) => {
  const weekStartTs = getWeekStartTimestamp();
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const dayStart = weekStartTs + i * 86400000;
    const dayEnd = dayStart + 86400000;
    return activities
      .filter((a) => {
        const ts = a.startedAt || a.createdAt || 0;
        return ts >= dayStart && ts < dayEnd;
      })
      .reduce((sum, a) => sum + (a.distanceMeters || 0) / 1000, 0);
  });
  const todayIdx = (new Date().getDay() + 6) % 7;
  const maxKm = Math.max(1, ...buckets);

  return (
    <View>
      {/* Header row */}
      <View style={barStyles.headerRow}>
        <Text style={barStyles.headerLabel}>THIS WEEK</Text>
        <Text style={barStyles.headerValue}>{weekKm.toFixed(1)} km</Text>
      </View>
      {/* Bars */}
      <View style={barStyles.barsRow}>
        {buckets.map((km, i) => {
          const pct = km > 0 ? Math.max(8, (km / maxKm) * 100) : 4;
          const isToday = i === todayIdx;
          const hasDist = km > 0;
          return (
            <View key={i} style={barStyles.barCol}>
              <View style={barStyles.barTrack}>
                <View
                  style={[
                    barStyles.barFill,
                    {
                      height: `${pct}%`,
                      backgroundColor: hasDist
                        ? isToday
                          ? theme.colors.primary
                          : theme.colors.primaryDark
                        : theme.colors.surfaceHighlight,
                    },
                    isToday && hasDist && barStyles.barGlow,
                  ]}
                />
              </View>
              <Text
                style={[
                  barStyles.barDay,
                  isToday && { color: theme.colors.primary, fontWeight: "700" },
                ]}
              >
                {DAY_LABELS[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const barStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  headerLabel: {
    ...theme.typography.caption,
    letterSpacing: 1.5,
    color: theme.colors.text.secondary,
  },
  headerValue: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 64,
    gap: 6,
  },
  barCol: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  barTrack: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  barFill: {
    width: "100%",
    borderRadius: 4,
    minHeight: 4,
  },
  barGlow: {
    shadowColor: "#C5F135",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  barDay: {
    fontSize: 8,
    color: theme.colors.text.tertiary,
    fontFamily: theme.typography.mono.fontFamily,
    fontWeight: "600",
  },
});

/* ─── Activity Row Item ─────────────────────────────────────── */
const ActivityRow = ({ activity, onPress }) => {
  const icon = getActivityIcon(activity.activityType, activity.workoutType);
  const label = getWorkoutLabel(activity.activityType, activity.workoutType);
  const zone = getZoneFromPace(activity.paceMinPerKm || activity.smoothedPaceMinPerKm);
  const pace = formatPace(activity.paceMinPerKm || activity.smoothedPaceMinPerKm);
  const dayLabel = formatTime(activity.startedAt || activity.createdAt);
  const distKm = ((activity.distanceMeters || 0) / 1000).toFixed(1);

  return (
    <Pressable
      style={({ pressed }) => [rowStyles.row, pressed && { opacity: 0.75 }]}
      onPress={onPress}
    >
      <View style={rowStyles.iconBox}>
        <Text style={rowStyles.iconText}>{icon}</Text>
      </View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{label}</Text>
        <Text style={rowStyles.meta}>
          {dayLabel}{pace !== "–" ? ` · ${pace} /km` : ""}{zone ? ` · ${zone}` : ""}
        </Text>
      </View>
      <Text style={rowStyles.dist}>{distKm}km</Text>
    </Pressable>
  );
};

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconText: { fontSize: 14 },
  info: { flex: 1 },
  name: { fontSize: 12, fontWeight: "500", color: theme.colors.text.primary },
  meta: {
    fontSize: 10,
    color: theme.colors.text.tertiary,
    marginTop: 2,
    fontFamily: theme.typography.mono.fontFamily,
  },
  dist: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
  },
});

/* ─── HomeScreen ────────────────────────────────────────────── */
const HomeScreen = ({ navigation }) => {
  const [activities, setActivities] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async ({ refreshing = false } = {}) => {
    const userId = auth?.currentUser?.uid;
    if (!userId) { setIsLoading(false); return; }
    try {
      setError("");
      if (refreshing) setIsRefreshing(true); else setIsLoading(true);
      const [nextActivities, nextProfile] = await Promise.all([
        getUserActivities(userId),
        getUserProfile(userId),
      ]);
      setActivities(nextActivities);
      setProfile(nextProfile);
    } catch (err) {
      setError(err.message || "Unable to load activities.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const totals = useMemo(() =>
    activities.reduce(
      (acc, a) => ({
        distanceMeters: acc.distanceMeters + (a.distanceMeters || 0),
        durationSeconds: acc.durationSeconds + (a.durationSeconds || 0),
      }),
      { distanceMeters: 0, durationSeconds: 0 }
    ),
    [activities]
  );

  const weekKm = useMemo(() => {
    const weekStart = getWeekStartTimestamp();
    return activities.reduce((sum, a) => {
      const ts = a.startedAt || a.createdAt || 0;
      return ts >= weekStart ? sum + (a.distanceMeters || 0) / 1000 : sum;
    }, 0);
  }, [activities]);

  const user = auth?.currentUser;
  const displayName = profile?.name || user?.displayName || user?.email?.split("@")[0] || "Athlete";
  const initials = getInitials(displayName);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      Alert.alert("Logout failed", err.message || "Failed to log out.");
    }
  };

  const recentActivities = activities.slice(0, 5);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData({ refreshing: true })}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{displayName} 👋</Text>
          </View>
          <TouchableOpacity style={styles.avatarCircle} onPress={handleLogout}>
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Lifetime Stat Cards ─────────────────────────── */}
        <View style={styles.statCards}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Distance</Text>
            <Text style={styles.statValue}>
              {formatDistanceKm(totals.distanceMeters)}
              <Text style={styles.statUnit}> km</Text>
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Time</Text>
            <Text style={styles.statValue}>
              {formatHours(totals.durationSeconds)}
              <Text style={styles.statUnit}> h</Text>
            </Text>
          </View>
        </View>

        {/* ── 7-Day Bar Chart Card ────────────────────────── */}
        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: 32 }} />
          ) : (
            <WeeklyBarChart activities={activities} weekKm={weekKm} />
          )}
        </View>

        {/* ── Recent Runs Feed ────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>RECENT RUNS</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Track")}>
              <Text style={styles.sectionAction}>+ New Run</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : isLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: 24 }} />
          ) : recentActivities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="walk-outline" size={32} color={theme.colors.text.tertiary} />
              <Text style={styles.emptyText}>No activities yet</Text>
              <Text style={styles.emptyDesc}>Start tracking your first run to see it here.</Text>
            </View>
          ) : (
            recentActivities.map((activity) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                onPress={() => navigation.navigate("ActivityDetail", { activity })}
              />
            ))
          )}

          {!isLoading && activities.length > 5 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate("History")}
            >
              <Text style={styles.viewAllText}>View all {activities.length} runs →</Text>
            </TouchableOpacity>
          )}
        </View>
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

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 4,
  },
  greeting: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginTop: 1,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
  },

  /* Stat cards */
  statCards: { flexDirection: "row", gap: theme.spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    ...theme.shadows.card,
  },
  statLabel: {
    fontSize: 9,
    color: theme.colors.text.tertiary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
    fontWeight: "600",
  },
  statValue: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 26,
    fontWeight: "700",
    color: theme.colors.text.primary,
    lineHeight: 30,
  },
  statUnit: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    fontFamily: theme.typography.mono.fontFamily,
  },

  /* Cards */
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },

  /* Section header within card */
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.text.secondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sectionAction: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: "600",
  },

  /* Empty state */
  emptyState: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.text.secondary,
  },
  emptyDesc: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    textAlign: "center",
  },

  /* View all */
  viewAllBtn: {
    paddingTop: theme.spacing.sm,
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: "600",
  },

  /* Error */
  errorText: {
    fontSize: 11,
    color: theme.colors.danger,
    textAlign: "center",
    paddingVertical: theme.spacing.md,
  },
});

export default HomeScreen;
