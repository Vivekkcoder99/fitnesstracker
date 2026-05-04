import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { auth } from "../../config/firebase";
import { getUserActivities } from "../../services/activityService";
import { logout } from "../../services/authService";
import { getUserProfile } from "../../services/profileService";
import { theme } from "../../theme";
import { Ionicons } from "@expo/vector-icons";
import PrimaryButton from "../../components/PrimaryButton";
import ActivityCard from "../../components/ActivityCard";
import CircularProgress from "../../components/CircularProgress";
import SmoothLineChart from "../../components/SmoothLineChart";

const ACTIVITY_TYPE_LABELS = {
  walk: "Walk",
  run: "Run",
  cycle: "Cycle",
};

const getActivityIcon = (activityType) => {
  switch (activityType) {
    case 'walk': return 'walk';
    case 'run': return 'body';
    case 'cycle': return 'bicycle';
    default: return 'fitness';
  }
};

const getActivityTypeLabel = (activityType) =>
  ACTIVITY_TYPE_LABELS[activityType] || "Activity";

const formatDistance = (meters = 0) => `${(meters / 1000).toFixed(2)} km`;

const formatDuration = (seconds = 0) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes < 1) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m ${remainingSeconds}s`;
};

const formatDate = (timestamp) => {
  if (!timestamp) return "Unknown date";
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatProfileNumber = (value, unit) =>
  value === null || value === undefined ? "Not set" : `${value} ${unit}`;

const getWeekStartTimestamp = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sunday
  const diff = day === 0 ? 6 : day - 1; // week starts Monday
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - diff);
  return weekStart.getTime();
};

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// Refactored Weekly Chart
const WeeklyChart = ({ activities }) => {
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

  return (
    <View style={barStripStyles.wrap}>
      <SmoothLineChart data={buckets} height={80} color={theme.colors.secondary} />
      <View style={barStripStyles.labelsRow}>
        {buckets.map((_, i) => (
          <Text key={i} style={[
            barStripStyles.label,
            i === todayIdx && { color: theme.colors.secondary, fontWeight: '700' },
          ]}>
            {DAY_LABELS[i]}
          </Text>
        ))}
      </View>
    </View>
  );
};

const barStripStyles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.md,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: theme.spacing.sm,
  },
  label: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.text.tertiary,
  },
});

const HomeScreen = ({ navigation }) => {
  const [activities, setActivities] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [error, setError] = useState("");
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator?.standalone;
    const userAgent = window.navigator?.userAgent || "";

    setIsStandalone(Boolean(standalone));
    setIsIosDevice(/iPad|iPhone|iPod/.test(userAgent));

    if (standalone) {
      return undefined;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const shouldShowIosInstallHint =
    Platform.OS === "web" && !isStandalone && !deferredInstallPrompt && isIosDevice;

  const loadActivities = useCallback(async ({ refreshing = false } = {}) => {
    const userId = auth?.currentUser?.uid;
    if (!userId) {
      setActivities([]);
      setIsLoading(false);
      return;
    }

    try {
      setError("");
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const [nextActivities, nextProfile] = await Promise.all([
        getUserActivities(userId),
        getUserProfile(userId),
      ]);
      setActivities(nextActivities);
      setProfile(nextProfile);
    } catch (loadError) {
      setError(loadError.message || "Unable to load activities.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [loadActivities])
  );

  const totals = useMemo(
    () =>
      activities.reduce(
        (summary, activity) => ({
          distanceMeters:
            summary.distanceMeters + (activity.distanceMeters || 0),
          durationSeconds:
            summary.durationSeconds + (activity.durationSeconds || 0),
        }),
        { distanceMeters: 0, durationSeconds: 0 }
      ),
    [activities]
  );

  const weeklyProgress = useMemo(() => {
    const weekStartTimestamp = getWeekStartTimestamp();

    return activities.reduce(
      (summary, activity) => {
        const referenceTime = activity.startedAt || activity.createdAt || 0;
        if (referenceTime < weekStartTimestamp) {
          return summary;
        }

        return {
          sessions: summary.sessions + 1,
          distanceMeters: summary.distanceMeters + (activity.distanceMeters || 0),
          durationSeconds:
            summary.durationSeconds + (activity.durationSeconds || 0),
        };
      },
      { sessions: 0, distanceMeters: 0, durationSeconds: 0 }
    );
  }, [activities]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      Alert.alert("Logout failed", error.message || "Failed to log out.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) {
      return;
    }

    try {
      setIsInstalling(true);
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      setDeferredInstallPrompt(null);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadActivities({ refreshing: true })}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Home</Text>
          <Text style={styles.subtitle}>{formatDate(Date.now())}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={isLoggingOut}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      {/* PWA Install Prompts */}
      {Platform.OS === "web" && deferredInstallPrompt ? (
        <View style={styles.installCard}>
          <Ionicons name="download-outline" size={32} color={theme.colors.primary} />
          <View style={styles.installTextContainer}>
            <Text style={styles.installTitle}>Install App</Text>
            <Text style={styles.installDesc}>Add to home screen for the best experience.</Text>
          </View>
          <TouchableOpacity style={styles.installButton} onPress={handleInstallApp} disabled={isInstalling}>
            <Text style={styles.installButtonText}>{isInstalling ? "..." : "Install"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {shouldShowIosInstallHint ? (
        <View style={styles.installCard}>
          <Ionicons name="share-outline" size={32} color={theme.colors.primary} />
          <View style={styles.installTextContainer}>
            <Text style={styles.installTitle}>Add to Home Screen</Text>
            <Text style={styles.installDesc}>Tap the Share button and choose &apos;Add to Home Screen&apos;.</Text>
          </View>
        </View>
      ) : null}

      {/* Circular Progress Hero */}
      <View style={styles.heroCard}>
        <View style={styles.heroContentCentered}>
          <CircularProgress
            size={160}
            strokeWidth={14}
            progress={weeklyProgress.distanceMeters / 40000}
            color={theme.colors.primary}
            value={(weeklyProgress.distanceMeters / 1000).toFixed(1)}
            unit="km"
            label="This Week"
          />
        </View>
      </View>

      {/* Smooth Line Chart Strip */}
      <View style={styles.dayStripCard}>
        <Text style={styles.dayStripLabel}>Activity Trend</Text>
        <WeeklyChart activities={activities} />
      </View>

      <PrimaryButton
        title="Start New Activity"
        icon="arrow-forward"
        onPress={() => navigation.navigate("Track")}
      />

      {/* Two Column Section */}
      <View style={styles.rowCards}>
        {/* Weekly Progress Card */}
        <View style={[styles.card, styles.flex1]}>
          <Text style={styles.cardTitle}>This Week</Text>
          <View style={styles.weeklyStatRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.text.tertiary} />
            <Text style={styles.statText}>{weeklyProgress.sessions} Sessions</Text>
          </View>
          <View style={styles.weeklyStatRow}>
            <Ionicons name="analytics-outline" size={16} color={theme.colors.text.tertiary} />
            <Text style={styles.statText}>{formatDistance(weeklyProgress.distanceMeters)}</Text>
          </View>
          <View style={styles.weeklyStatRow}>
            <Ionicons name="timer-outline" size={16} color={theme.colors.text.tertiary} />
            <Text style={styles.statText}>{formatDuration(weeklyProgress.durationSeconds)}</Text>
          </View>
        </View>

        {/* Profile Summary Card */}
        <Pressable
          style={({ pressed }) => [styles.card, styles.flex1, pressed && styles.cardPressed]}
          onPress={() => navigation.navigate("Profile")}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Profile</Text>
            <Ionicons name="pencil" size={16} color={theme.colors.primary} />
          </View>
          <Text style={styles.statText} numberOfLines={1}>Age: {profile?.age ?? "--"}</Text>
          <Text style={styles.statText} numberOfLines={1}>Wt: {formatProfileNumber(profile?.weight, "kg")}</Text>
          <Text style={styles.statText} numberOfLines={1}>Ht: {formatProfileNumber(profile?.height, "cm")}</Text>
        </Pressable>
      </View>

      {/* Recent Activities List */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Recent Activities</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading activities...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!isLoading && activities.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="leaf-outline" size={48} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyStateTitle}>No activities yet</Text>
            <Text style={styles.emptyStateDesc}>
              Start tracking your first workout to see it here.
            </Text>
          </View>
        ) : null}

        {!isLoading
          ? activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onPress={() => navigation.navigate("ActivityDetail", { activity })}
              formatDistance={formatDistance}
              formatDuration={formatDuration}
              formatDate={formatDate}
              getActivityTypeLabel={getActivityTypeLabel}
            />
          ))
          : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: {
    ...theme.typography.h1,
  },
  subtitle: {
    ...theme.typography.caption,
    marginTop: 4,
  },
  logoutButton: {
    padding: theme.spacing.xs,
  },
  installCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.card,
  },
  installTextContainer: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  installTitle: {
    ...theme.typography.h3,
    fontSize: 14,
  },
  installDesc: {
    ...theme.typography.caption,
  },
  installButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  installButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    flexDirection: "row",
    overflow: "hidden",
    ...theme.shadows.card,
  },
  heroContentCentered: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  heroAccentRail: {
    width: 6,
    backgroundColor: theme.colors.secondary,
  },
  heroContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  heroLabel: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.sm,
  },
  heroMainRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: theme.spacing.md,
  },
  heroMainValue: {
    ...theme.typography.mono,
    fontSize: 32,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  heroMainUnit: {
    ...theme.typography.mono,
    fontSize: 16,
    color: theme.colors.text.tertiary,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: theme.colors.primary,
  },
  dayStripCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  dayStripLabel: {
    ...theme.typography.caption,
    fontSize: 9,
    letterSpacing: 2,
  },

  rowCards: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  flex1: {
    flex: 1,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    ...theme.typography.caption,
  },
  weeklyStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  statText: {
    ...theme.typography.mono,
    fontSize: 13,
    color: theme.colors.text.primary,
  },
  listContainer: {
    gap: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.caption,
    letterSpacing: 2,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  loadingText: {
    ...theme.typography.caption,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    textAlign: "center",
  },
  emptyStateContainer: {
    alignItems: "center",
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    gap: theme.spacing.sm,
  },
  emptyStateTitle: {
    ...theme.typography.h3,
    fontSize: 15,
  },
  emptyStateDesc: {
    ...theme.typography.body,
    fontSize: 13,
    textAlign: "center",
  },
});


export default HomeScreen;
