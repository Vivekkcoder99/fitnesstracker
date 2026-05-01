import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { auth } from "../../config/firebase";
import { getUserActivities } from "../../services/activityService";
import { logout } from "../../services/authService";
import { getUserProfile } from "../../services/profileService";

const ACTIVITY_TYPE_LABELS = {
  walk: "Walk",
  run: "Run",
  cycle: "Cycle",
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

const HomeScreen = ({ navigation }) => {
  const [activities, setActivities] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadActivities({ refreshing: true })}
        />
      }
    >
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#0F172A" }}>
          Dashboard
        </Text>
        <Text style={{ color: "#475569" }}>
          Track your workouts and review your recent activity.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 8,
          padding: 16,
          gap: 14,
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
          Lifetime totals
        </Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#64748B", marginBottom: 4 }}>Distance</Text>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>
              {formatDistance(totals.distanceMeters)}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: "#64748B", marginBottom: 4 }}>Time</Text>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>
              {formatDuration(totals.durationSeconds)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Start Activity"
              onPress={() => navigation.navigate("Track")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={isLoggingOut ? "Logging out..." : "Log Out"}
              onPress={handleLogout}
              disabled={isLoggingOut}
            />
          </View>
        </View>
      </View>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 8,
          padding: 16,
          gap: 10,
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
            Profile summary
          </Text>
          <Pressable onPress={() => navigation.navigate("Profile")}>
            <Text style={{ color: "#2563EB", fontWeight: "700" }}>
              Edit Profile
            </Text>
          </Pressable>
        </View>

        <Text style={{ color: "#0F172A", fontWeight: "600", fontSize: 16 }}>
          {profile?.name || "Unnamed athlete"}
        </Text>
        <Text style={{ color: "#475569" }}>
          Age: {profile?.age ?? "Not set"} · Weight:{" "}
          {formatProfileNumber(profile?.weight, "kg")} · Height:{" "}
          {formatProfileNumber(profile?.height, "cm")}
        </Text>
        <Text style={{ color: "#475569" }}>
          Goal: {profile?.goal || "No goal added yet."}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 8,
          padding: 16,
          gap: 10,
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
          Weekly progress
        </Text>
        <Text style={{ color: "#475569" }}>
          Sessions this week: {weeklyProgress.sessions}
        </Text>
        <Text style={{ color: "#475569" }}>
          Distance this week: {formatDistance(weeklyProgress.distanceMeters)}
        </Text>
        <Text style={{ color: "#475569" }}>
          Active time this week: {formatDuration(weeklyProgress.durationSeconds)}
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
          Recent activities
        </Text>

        {isLoading ? (
          <View style={{ padding: 24, alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text style={{ color: "#475569" }}>Loading activities...</Text>
          </View>
        ) : null}

        {error ? <Text style={{ color: "#B91C1C" }}>{error}</Text> : null}

        {!isLoading && activities.length === 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 8,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <Text style={{ fontWeight: "600", marginBottom: 4 }}>
              No activities yet
            </Text>
            <Text style={{ color: "#475569" }}>
              Start and save your first workout to see it here.
            </Text>
          </View>
        ) : null}

        {!isLoading
          ? activities.map((activity) => (
              <Pressable
                key={activity.id}
                onPress={() =>
                  navigation.navigate("ActivityDetail", { activity })
                }
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#F1F5F9" : "#FFFFFF",
                  borderRadius: 8,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  gap: 8,
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <Text style={{ fontWeight: "700", color: "#0F172A" }}>
                    {getActivityTypeLabel(activity.activityType)}
                  </Text>
                  <Text style={{ color: "#64748B" }}>
                    {formatDate(activity.startedAt || activity.createdAt)}
                  </Text>
                </View>

                <Text style={{ color: "#475569" }}>
                  {formatDistance(activity.distanceMeters)} ·{" "}
                  {formatDuration(activity.durationSeconds)} ·{" "}
                  {(activity.paceMinPerKm || 0).toFixed(2)} min/km ·{" "}
                  {activity.pointsCount || 0} points
                </Text>
              </Pressable>
            ))
          : null}
      </View>
    </ScrollView>
  );
};

export default HomeScreen;
