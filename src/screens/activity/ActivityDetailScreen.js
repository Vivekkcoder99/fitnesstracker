import React from "react";
import { ScrollView, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

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
  <View
    style={{
      flex: 1,
      minWidth: 140,
      backgroundColor: "#FFFFFF",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      padding: 16,
      gap: 4,
    }}
  >
    <Text style={{ color: "#64748B" }}>{label}</Text>
    <Text style={{ fontSize: 22, fontWeight: "700", color: "#0F172A" }}>
      {value}
    </Text>
  </View>
);

const ActivityDetailScreen = ({ route }) => {
  const activity = route?.params?.activity;

  if (!activity) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
        <Text>No activity selected.</Text>
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
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#0F172A" }}>
          {getActivityTypeLabel(activity.activityType)}
        </Text>
        <Text style={{ color: "#475569" }}>{formatDateTime(startedAt)}</Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <StatCard
          label="Distance"
          value={formatDistance(activity.distanceMeters)}
        />
        <StatCard
          label="Duration"
          value={formatDuration(activity.durationSeconds)}
        />
        <StatCard
          label="Pace"
          value={`${(activity.paceMinPerKm || 0).toFixed(2)} min/km`}
        />
        <StatCard label="GPS points" value={activity.pointsCount || 0} />
      </View>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          padding: 16,
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
          Route preview
        </Text>
        {routeRegion ? (
          <View style={{ borderRadius: 8, overflow: "hidden" }}>
            <MapView
              style={{ width: "100%", height: 260 }}
              initialRegion={routeRegion}
              scrollEnabled
              zoomEnabled
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#2563EB"
                strokeWidth={4}
              />
              {startPoint ? (
                <Marker coordinate={startPoint} title="Start" pinColor="#16A34A" />
              ) : null}
              {endPoint ? (
                <Marker coordinate={endPoint} title="Finish" pinColor="#DC2626" />
              ) : null}
            </MapView>
          </View>
        ) : (
          <Text style={{ color: "#475569" }}>
            No route points were saved for this activity.
          </Text>
        )}
      </View>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          padding: 16,
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
          Session details
        </Text>
        <Text style={{ color: "#475569" }}>
          Type: {getActivityTypeLabel(activity.activityType)}
        </Text>
        <Text style={{ color: "#475569" }}>
          Started: {formatDateTime(activity.startedAt)}
        </Text>
        <Text style={{ color: "#475569" }}>
          Ended: {formatDateTime(activity.endedAt)}
        </Text>
        <Text style={{ color: "#475569" }}>
          Saved: {formatDateTime(activity.createdAt)}
        </Text>
      </View>
    </ScrollView>
  );
};

export default ActivityDetailScreen;
