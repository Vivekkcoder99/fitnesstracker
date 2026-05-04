import React from "react";
import { ScrollView, Text, View, StyleSheet, Dimensions, SafeAreaView, StatusBar } from "react-native";
import RouteMap from "./RouteMap";
import { theme } from "../../theme";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

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

const formatDateTime = (timestamp) => {
  if (!timestamp) return "Unknown";
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getRouteCoordinates = (route = []) =>
  route
    .filter(
      (point) =>
        typeof point?.latitude === "number" && typeof point?.longitude === "number"
    )
    .map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }));

const getRouteRegion = (coordinates) => {
  if (!coordinates.length) {
    return null;
  }

  const latitudes = coordinates.map((point) => point.latitude);
  const longitudes = coordinates.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latitudeDelta = Math.max(0.005, (maxLat - minLat) * 1.4);
  const longitudeDelta = Math.max(0.005, (maxLng - minLng) * 1.4);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
};

const StatCard = ({ label, value }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ActivityDetailScreen = ({ route }) => {
  const activity = route?.params?.activity;

  if (!activity) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No activity selected.</Text>
      </View>
    );
  }

  const startedAt = activity.startedAt || activity.createdAt;
  const routeCoordinates = getRouteCoordinates(activity.route);
  const routeRegion = getRouteRegion(routeCoordinates);
  const startPoint = routeCoordinates[0];
  const endPoint =
    routeCoordinates.length > 1
      ? routeCoordinates[routeCoordinates.length - 1]
      : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ backgroundColor: theme.colors.background }} />
      <View style={styles.screenHeader}>
        <Text style={styles.screenHeaderTitle}>Activity Details</Text>
      </View>
      <ScrollView style={styles.container} bounces={false}>
        <View style={styles.mapContainer}>
          {routeRegion ? (
            <RouteMap
              routeCoordinates={routeCoordinates}
              routeRegion={routeRegion}
              startPoint={startPoint}
              endPoint={endPoint}
              avatarId={activity.avatarId}
            />
          ) : (
          <View style={styles.noRouteContainer}>
            <Ionicons name="map-outline" size={48} color={theme.colors.text.tertiary} />
            <Text style={styles.noRouteText}>No route recorded.</Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.brandText}>● PACE SESSION</Text>
          <Text style={styles.title}>{getActivityTypeLabel(activity.activityType)}</Text>
          <Text style={styles.dateText}>{formatDateTime(startedAt)}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              label="Distance"
              value={formatDistance(activity.distanceMeters)}
            />
            <StatCard
              label="Duration"
              value={formatDuration(activity.durationSeconds)}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              label="Avg Pace"
              value={`${(activity.paceMinPerKm || 0).toFixed(2)}`}
            />
            <StatCard
              label="Energy"
              value={`${Math.round((activity.distanceMeters / 1000) * 60)} kcal`}
            />
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Session Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Started</Text>
            <Text style={styles.detailValue}>{formatDateTime(activity.startedAt)}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ended</Text>
            <Text style={styles.detailValue}>{formatDateTime(activity.endedAt)}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>GPS Points</Text>
            <Text style={styles.detailValue}>{activity.pointsCount || 0}</Text>
          </View>
          {activity.steps ? (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Steps</Text>
                <Text style={styles.detailValue}>{activity.steps}</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </ScrollView>
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenHeader: {
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  screenHeaderTitle: {
    ...theme.typography.body,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  errorText: {
    ...theme.typography.caption,
  },
  mapContainer: {
    width: width,
    height: width * 0.8,
    backgroundColor: theme.colors.surface,
  },
  noRouteContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
  },
  noRouteText: {
    ...theme.typography.caption,
    marginTop: theme.spacing.sm,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    marginTop: -theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.md,
    borderTopRightRadius: theme.borderRadius.md,
  },
  header: {
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
  },
  brandText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    ...theme.typography.h1,
    fontSize: 32,
  },
  dateText: {
    ...theme.typography.body,
    color: theme.colors.text.tertiary,
  },
  statsGrid: {
    gap: 1,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statsRow: {
    flexDirection: "row",
    gap: 1,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.caption,
    fontSize: 9,
    color: theme.colors.text.tertiary,
  },
  statValue: {
    ...theme.typography.mono,
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  detailsCard: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.caption,
    letterSpacing: 2,
    marginBottom: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  detailLabel: {
    ...theme.typography.body,
    color: theme.colors.text.tertiary,
    fontSize: 14,
  },
  detailValue: {
    ...theme.typography.mono,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
});

export default ActivityDetailScreen;
