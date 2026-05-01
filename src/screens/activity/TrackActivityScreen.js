import React, { useEffect, useRef, useState } from "react";
import { View, Text, Button, Alert, Pressable } from "react-native";
import { auth } from "../../config/firebase";
import {
  requestLocationPermission,
  getCurrentLocation,
  watchLocation,
} from "../../services/locationService";
import { saveActivity } from "../../services/activityService";

const STEP_LENGTH_METERS = 0.75;
const SAVE_TIMEOUT_MS = 12000;
const ACTIVITY_TYPES = [
  { label: "Walk", value: "walk" },
  { label: "Run", value: "run" },
  { label: "Cycle", value: "cycle" },
];

const toRadians = (value) => (value * Math.PI) / 180;

const getDistanceInMeters = (pointA, pointB) => {
  const earthRadius = 6371000;
  const dLat = toRadians(pointB.latitude - pointA.latitude);
  const dLng = toRadians(pointB.longitude - pointA.longitude);
  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const calculateTotalDistance = (points) => {
  if (points.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += getDistanceInMeters(points[i - 1], points[i]);
  }
  return total;
};

const interpolatePoint = (startPoint, endPoint, ratio) => {
  return {
    latitude: startPoint.latitude + (endPoint.latitude - startPoint.latitude) * ratio,
    longitude:
      startPoint.longitude + (endPoint.longitude - startPoint.longitude) * ratio,
    timestamp: Date.now(),
  };
};

const TrackActivityScreen = () => {
  const [activityType, setActivityType] = useState("walk");
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [coordinates, setCoordinates] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [stats, setStats] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const locationSubscriptionRef = useRef(null);
  const startedAtRef = useRef(null);
  const coordinatesRef = useRef([]);

  const stopTracking = async () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    setIsTracking(false);

    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const userId = auth?.currentUser?.uid;
      if (!userId) {
        throw new Error("You must be logged in to save activity.");
      }

      const routePoints = coordinatesRef.current;
      if (!startedAtRef.current || routePoints.length < 1) {
        throw new Error("No location points captured. Please try again.");
      }

      const endedAt = Date.now();
      const durationSeconds = Math.max(
        1,
        Math.floor((endedAt - startedAtRef.current) / 1000)
      );
      const distanceMeters = calculateTotalDistance(routePoints);
      const distanceKm = distanceMeters / 1000;
      const paceMinPerKm =
        distanceKm > 0 ? durationSeconds / 60 / distanceKm : 0;

      const cleanedRoute = routePoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: point.timestamp || Date.now(),
      }));

      const activityId = await Promise.race([
        saveActivity(userId, {
          activityType,
          startedAt: startedAtRef.current,
          endedAt,
          durationSeconds,
          distanceMeters,
          distanceKm,
          paceMinPerKm,
          pointsCount: cleanedRoute.length,
          route: cleanedRoute,
        }),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("Save timed out. Check internet or Firestore rules."));
          }, SAVE_TIMEOUT_MS);
        }),
      ]);

      setStats({
        activityType,
        durationSeconds,
        distanceMeters,
        paceMinPerKm,
      });
      setMessage("Activity saved successfully.");
      console.log("Activity saved:", activityId);
      Alert.alert("Saved", "Activity saved successfully.");
    } catch (err) {
      console.log("Save activity error:", err?.code, err?.message);
      if (err?.code === "permission-denied") {
        setError(
          "Firestore permission denied. Check Firestore rules for authenticated writes."
        );
      } else if (err?.code === "failed-precondition") {
        setError("Firestore is not enabled yet. Enable Firestore in Firebase.");
      } else {
        setError(err.message || "Failed to save activity.");
      }
      Alert.alert("Save failed", err?.message || "Failed to save activity.");
    } finally {
      setIsSaving(false);
    }
  };

  const startTracking = async () => {
    try {
      setError("");
      setMessage("");
      setStats(null);

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setError("Location permission denied. Please allow location access.");
        return;
      }

      const initialLocation = await getCurrentLocation();
      const firstPoint = initialLocation.coords;

      setCurrentLocation(firstPoint);
      setCoordinates([firstPoint]);
      coordinatesRef.current = [firstPoint];
      startedAtRef.current = Date.now();
      console.log("GPS:", firstPoint.latitude, firstPoint.longitude);

      const subscription = await watchLocation((location) => {
        const nextPoint = location.coords;
        setCurrentLocation(nextPoint);
        setCoordinates((prev) => {
          if (prev.length === 0) {
            const next = [nextPoint];
            coordinatesRef.current = next;
            return next;
          }

          const lastPoint = prev[prev.length - 1];
          const movedMeters = getDistanceInMeters(lastPoint, nextPoint);

          // Ignore tiny GPS jitter so points represent real movement.
          if (movedMeters < STEP_LENGTH_METERS) {
            return prev;
          }

          // Approximate "1 step = 1 point" by interpolating one point per step.
          const stepCount = Math.max(1, Math.floor(movedMeters / STEP_LENGTH_METERS));
          const generatedPoints = [];
          for (let i = 1; i <= stepCount; i += 1) {
            const ratio = i / stepCount;
            generatedPoints.push(interpolatePoint(lastPoint, nextPoint, ratio));
          }

          const next = [...prev, ...generatedPoints];
          coordinatesRef.current = next;
          return next;
        });
        console.log("GPS:", nextPoint.latitude, nextPoint.longitude);
      });

      locationSubscriptionRef.current = subscription;
      setIsTracking(true);
    } catch (err) {
      setError(err.message || "Unable to start activity tracking.");
    }
  };

  useEffect(() => {
    return () => {
      // Prevent leak when leaving this screen.
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, []);

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>Track Activity</Text>

      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: "600" }}>Activity type</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {ACTIVITY_TYPES.map((type) => {
            const isSelected = activityType === type.value;

            return (
              <Pressable
                key={type.value}
                onPress={() => setActivityType(type.value)}
                disabled={isTracking || isSaving}
                style={{
                  flex: 1,
                  alignItems: "center",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isSelected ? "#2563EB" : "#CBD5E1",
                  backgroundColor: isSelected ? "#DBEAFE" : "#FFFFFF",
                  paddingVertical: 10,
                  opacity: isTracking || isSaving ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? "#1D4ED8" : "#334155",
                    fontWeight: "700",
                  }}
                >
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!isTracking ? (
        <Button title="Start Activity" onPress={startTracking} />
      ) : (
        <Button
          title={isSaving ? "Saving..." : "Stop Activity"}
          onPress={stopTracking}
          disabled={isSaving}
        />
      )}

      {error ? <Text style={{ color: "red" }}>{error}</Text> : null}
      {message ? <Text style={{ color: "green" }}>{message}</Text> : null}
      {isSaving ? <Text>Saving activity...</Text> : null}

      <Text>Points collected: {coordinates.length}</Text>

      {currentLocation ? (
        <>
          <Text>Latitude: {currentLocation.latitude}</Text>
          <Text>Longitude: {currentLocation.longitude}</Text>
        </>
      ) : (
        <Text>No location yet.</Text>
      )}

      {stats ? (
        <>
          <Text>
            Type:{" "}
            {ACTIVITY_TYPES.find((type) => type.value === stats.activityType)
              ?.label || "Activity"}
          </Text>
          <Text>Distance: {(stats.distanceMeters / 1000).toFixed(2)} km</Text>
          <Text>Duration: {Math.floor(stats.durationSeconds / 60)} min</Text>
          <Text>Pace: {stats.paceMinPerKm.toFixed(2)} min/km</Text>
        </>
      ) : null}
    </View>
  );
};

export default TrackActivityScreen;
