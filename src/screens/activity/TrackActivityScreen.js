import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Alert, TouchableOpacity, ActivityIndicator, StyleSheet, SafeAreaView, Platform, Image, DeviceEventEmitter } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { auth } from "../../config/firebase";
import {
  requestLocationPermission,
  getCurrentLocation,
  watchLocation,
  startBackgroundLocationUpdates,
  stopBackgroundLocationUpdates,
} from "../../services/locationService";
import { saveActivity } from "../../services/activityService";
import { getUserProfile } from "../../services/profileService";
import { getAvatarSource } from "../../components/AvatarSelector";
let MapView = null;
let Polyline = null;
let Marker = null;
if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Polyline = Maps.Polyline;
  Marker = Maps.Marker;
}
import TimerDisplay from "../../components/TimerDisplay";
import StatCard from "../../components/StatCard";
import PrimaryButton from "../../components/PrimaryButton";
import FloatingActionButton from "../../components/FloatingActionButton";

const STEP_LENGTH_METERS = 0.75;
const SAVE_TIMEOUT_MS = 12000;
const MIN_DISTANCE_METERS = 3.0; // Increased to reduce jitter
const MIN_REQUIRED_ACCURACY_METERS = 40;
const MAX_STEP_CADENCE_INTERVAL_MS = 2000;
const MIN_STEP_CADENCE_INTERVAL_MS = 250;
const AUTO_PAUSE_IDLE_MS = 15000; // Increased from 3s to 15s for better UX
const STEP_BATCH_SIZE = 25;
const STEP_BATCH_INTERVAL_MS = 30000;
const PACE_SMOOTHING_WINDOW = 5;
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

const toUtcIso = (timestamp) => new Date(timestamp).toISOString();

const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const getStepLengthByActivityType = (type) => {
  switch (type) {
    case "run":
      return 1.0;
    case "walk":
      return STEP_LENGTH_METERS;
    default:
      return 0;
  }
};

const getSpeedBoundsByActivityType = (type) => {
  switch (type) {
    case "walk":
      return { minActiveMps: 0.55, maxMps: 2.8 };
    case "run":
      return { minActiveMps: 1.4, maxMps: 6.5 };
    case "cycle":
      return { minActiveMps: 1.8, maxMps: 15 };
    default:
      return { minActiveMps: 0.55, maxMps: 6.5 };
  }
};

const smoothMovingAverage = (values, windowSize) =>
  values.map((_, index) => {
    const from = Math.max(0, index - windowSize + 1);
    const window = values.slice(from, index + 1);
    return window.reduce((sum, value) => sum + value, 0) / window.length;
  });

const interpolatePoint = (startPoint, endPoint, ratio) => {
  return {
    latitude: startPoint.latitude + (endPoint.latitude - startPoint.latitude) * ratio,
    longitude:
      startPoint.longitude + (endPoint.longitude - startPoint.longitude) * ratio,
    timestamp: Date.now(),
  };
};

const TrackActivityScreen = ({ navigation }) => {
  const [activityType, setActivityType] = useState("walk");
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [coordinates, setCoordinates] = useState([]);
  const [stats, setStats] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarId, setAvatarId] = useState("avatar_1");
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [smoothedPaceMinPerKm, setSmoothedPaceMinPerKm] = useState(0);
  const locationSubscriptionRef = useRef(null);
  const startedAtRef = useRef(null);
  const coordinatesRef = useRef([]);
  const activeAccumMsRef = useRef(0);
  const resumedAtMsRef = useRef(null);
  const lastValidPointRef = useRef(null);
  const lastObservedPointRef = useRef(null);
  const lastMovementAtMsRef = useRef(null);
  const isPausedRef = useRef(false);
  const pauseReasonRef = useRef(null);
  const autoPauseCountRef = useRef(0);
  const manualPauseCountRef = useRef(0);
  const stepCountRef = useRef(0);
  const pendingStepBatchRef = useRef(0);
  const stepBatchesRef = useRef([]);
  const lastStepBatchAtMsRef = useRef(0);
  const segmentPacesRef = useRef([]);

  const flushStepBatch = (timestamp, force = false) => {
    const pending = pendingStepBatchRef.current;
    if (!pending) return;

    if (!force) {
      const sinceLast = timestamp - lastStepBatchAtMsRef.current;
      if (pending < STEP_BATCH_SIZE && sinceLast < STEP_BATCH_INTERVAL_MS) {
        return;
      }
    }

    stepBatchesRef.current.push({
      atUtc: toUtcIso(timestamp),
      steps: pending,
    });
    pendingStepBatchRef.current = 0;
    lastStepBatchAtMsRef.current = timestamp;
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userId = auth?.currentUser?.uid;
        if (userId) {
          const profile = await getUserProfile(userId);
          setAvatarId(profile.avatarId || "avatar_1");
        }
      } catch (err) {
        console.error("Failed to load avatar:", err);
      }
    };
    loadProfile();
  }, []);

  const pauseTracking = useCallback((reason) => {
    if (!isTracking || isPausedRef.current) return;

    if (reason !== "auto" && locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }

    const now = Date.now();
    if (resumedAtMsRef.current) {
      activeAccumMsRef.current += now - resumedAtMsRef.current;
      resumedAtMsRef.current = null;
    }

    if (reason === "auto") {
      autoPauseCountRef.current += 1;
    } else {
      manualPauseCountRef.current += 1;
    }

    setIsPaused(true);
    setPauseReason(reason);
    isPausedRef.current = true;
    pauseReasonRef.current = reason;
  }, [isTracking]);

  const resumeFromAutoPause = (timestampMs) => {
    resumedAtMsRef.current = timestampMs;
    lastMovementAtMsRef.current = timestampMs;
    setIsPaused(false);
    setPauseReason(null);
    setMessage("Resumed automatically.");
    isPausedRef.current = false;
    pauseReasonRef.current = null;
  };

  const isMeaningfulMovement = (previous, nextPoint, timestampMs) => {
    if (!previous) return false;

    const accuracy = Number(nextPoint.accuracy || 9999);
    if (accuracy > MIN_REQUIRED_ACCURACY_METERS) return false;

    const previousTimestamp = Number(previous.timestamp || timestampMs - 1000);
    const deltaTimeSeconds = Math.max(0.001, (timestampMs - previousTimestamp) / 1000);
    const movedMeters = getDistanceInMeters(previous, nextPoint);
    const speedMps = movedMeters / deltaTimeSeconds;
    const bounds = getSpeedBoundsByActivityType(activityType);

    return (
      movedMeters >= MIN_DISTANCE_METERS &&
      speedMps >= bounds.minActiveMps &&
      speedMps <= bounds.maxMps
    );
  };

  const processMovementSample = (nextPoint, timestampMs) => {
    const previous = lastValidPointRef.current;
    const accuracy = Number(nextPoint.accuracy || 9999);

    if (!previous) {
      lastValidPointRef.current = nextPoint;
      lastMovementAtMsRef.current = timestampMs;
      return { accepted: true, movedMeters: 0 };
    }

    if (accuracy > MIN_REQUIRED_ACCURACY_METERS) {
      return { accepted: false, reason: "low_accuracy" };
    }

    const previousTimestamp = Number(previous.timestamp || timestampMs - 1000);
    const deltaTimeSeconds = Math.max(0.001, (timestampMs - previousTimestamp) / 1000);
    const movedMeters = getDistanceInMeters(previous, nextPoint);
    const speedMps = movedMeters / deltaTimeSeconds;
    const bounds = getSpeedBoundsByActivityType(activityType);

    if (movedMeters < MIN_DISTANCE_METERS) {
      return { accepted: false, reason: "jitter" };
    }

    if (speedMps > bounds.maxMps) {
      return { accepted: false, reason: "gps_leap" };
    }

    // Auto-pause logic only considers meaningful movement.
    if (speedMps < bounds.minActiveMps) {
      return { accepted: false, reason: "stationary" };
    }

    const paceMinPerKm = (deltaTimeSeconds / 60) / (movedMeters / 1000);
    if (Number.isFinite(paceMinPerKm) && paceMinPerKm >= 2 && paceMinPerKm <= 30) {
      segmentPacesRef.current.push(paceMinPerKm);
      const smoothed = smoothMovingAverage(
        segmentPacesRef.current,
        PACE_SMOOTHING_WINDOW
      );
      setSmoothedPaceMinPerKm(smoothed[smoothed.length - 1]);
    }

    const stepLength = getStepLengthByActivityType(activityType);
    if (stepLength > 0) {
      const estimatedSteps = Math.floor(movedMeters / stepLength);
      if (estimatedSteps > 0) {
        const stepIntervalMs = (deltaTimeSeconds * 1000) / estimatedSteps;
        if (
          stepIntervalMs >= MIN_STEP_CADENCE_INTERVAL_MS &&
          stepIntervalMs <= MAX_STEP_CADENCE_INTERVAL_MS
        ) {
          stepCountRef.current += estimatedSteps;
          pendingStepBatchRef.current += estimatedSteps;
          setTotalSteps(stepCountRef.current);
          flushStepBatch(timestampMs);
        }
      }
    }

    lastValidPointRef.current = nextPoint;
    lastMovementAtMsRef.current = timestampMs;
    return { accepted: true, movedMeters, speedMps };
  };

  const handleNewLocation = useCallback((location) => {
    const nextPoint = location.coords;
    const timestampMs = Number(location?.timestamp || Date.now());
    const pointWithTimestamp = {
      ...nextPoint,
      timestamp: timestampMs,
    };

    const previousObservedPoint = lastObservedPointRef.current;
    lastObservedPointRef.current = pointWithTimestamp;

    if (isPausedRef.current && pauseReasonRef.current === "auto") {
      if (isMeaningfulMovement(previousObservedPoint, pointWithTimestamp, timestampMs)) {
        lastValidPointRef.current = pointWithTimestamp;
        resumeFromAutoPause(timestampMs);
      }
      return;
    }

    if (isPausedRef.current) return;

    const result = processMovementSample(pointWithTimestamp, timestampMs);

    if (!result.accepted) {
      return;
    }

    setCoordinates((prev) => {
      if (prev.length === 0) {
        const next = [pointWithTimestamp];
        coordinatesRef.current = next;
        return next;
      }

      const lastPoint = prev[prev.length - 1];
      const movedMeters = getDistanceInMeters(lastPoint, pointWithTimestamp);
      
      // Interpolate points for smoother map visualization, but cap it to avoid array bloat
      const stepCount = Math.min(5, Math.max(1, Math.floor(movedMeters / 10)));
      const generatedPoints = [];
      for (let i = 1; i <= stepCount; i += 1) {
        const ratio = i / stepCount;
        generatedPoints.push(interpolatePoint(lastPoint, pointWithTimestamp, ratio));
      }

      const next = [...prev, ...generatedPoints];
      coordinatesRef.current = next;
      return next;
    });
  }, [activityType, isPaused, resumeFromAutoPause]);

  const startLocationWatch = async () => {
    if (locationSubscriptionRef.current) {
      return;
    }

    const subscription = await watchLocation(handleNewLocation);
    locationSubscriptionRef.current = subscription;
    
    if (Platform.OS !== "web") {
      await startBackgroundLocationUpdates();
    }
  };

  const stopTracking = async () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    
    if (Platform.OS !== "web") {
      await stopBackgroundLocationUpdates();
    }
    setIsTracking(false);
    setIsPaused(false);
    setPauseReason(null);
    isPausedRef.current = false;
    pauseReasonRef.current = null;

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
      if (resumedAtMsRef.current) {
        activeAccumMsRef.current += endedAt - resumedAtMsRef.current;
        resumedAtMsRef.current = null;
      }

      flushStepBatch(endedAt, true);

      const elapsedTimeSeconds = Math.max(
        1,
        Math.floor((endedAt - startedAtRef.current) / 1000)
      );
      const activeTimeSeconds = Math.max(1, Math.floor(activeAccumMsRef.current / 1000));
      const pausedTimeSeconds = Math.max(0, elapsedTimeSeconds - activeTimeSeconds);
      const distanceMeters = calculateTotalDistance(routePoints);
      const distanceKm = distanceMeters / 1000;
      const paceMinPerKm = distanceKm > 0 ? activeTimeSeconds / 60 / distanceKm : 0;
      const avgSpeedMps = activeTimeSeconds > 0 ? distanceMeters / activeTimeSeconds : 0;

      const cleanedRoute = routePoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: point.timestamp || Date.now(),
      }));

      const payload = {
        activityType,
        startedAt: startedAtRef.current,
        endedAt,
        startedAtUtc: toUtcIso(startedAtRef.current),
        endedAtUtc: toUtcIso(endedAt),
        avatarId,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        elapsedTimeSeconds,
        activeTimeSeconds,
        pausedTimeSeconds,
        durationSeconds: activeTimeSeconds,
        distanceMeters,
        distanceKm,
        avgSpeedMps: round(avgSpeedMps, 3),
        paceMinPerKm: round(paceMinPerKm, 3),
        smoothedPaceMinPerKm: round(smoothedPaceMinPerKm || paceMinPerKm, 3),
        paceSeriesMinPerKm: segmentPacesRef.current.map((value) => round(value, 3)),
        stepCount: stepCountRef.current,
        stepBatches: stepBatchesRef.current,
        pointsCount: cleanedRoute.length,
        route: cleanedRoute,
        pauseSummary: {
          manualPauses: manualPauseCountRef.current,
          autoPauses: autoPauseCountRef.current,
        },
        overview: {
          distanceKm: round(distanceKm, 2),
          activeTimeSeconds,
          elapsedTimeSeconds,
          paceMinPerKm: round(paceMinPerKm, 2),
          steps: stepCountRef.current,
        },
        workout: {
          type: activityType,
          routePoints: cleanedRoute.length,
          avgSpeedMps: round(avgSpeedMps, 2),
          smoothedPaceMinPerKm: round(smoothedPaceMinPerKm || paceMinPerKm, 2),
        },
        nutrition: {
          recommendedHydrationMl: Math.max(250, Math.round(activeTimeSeconds / 60) * 10),
        },
      };

      const activityId = await Promise.race([
        saveActivity(userId, payload),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("Save timed out. Check internet or Firestore rules."));
          }, SAVE_TIMEOUT_MS);
        }),
      ]);

      setStats({
        activityType,
        elapsedTimeSeconds,
        activeTimeSeconds,
        distanceMeters,
        paceMinPerKm,
        smoothedPaceMinPerKm: smoothedPaceMinPerKm || paceMinPerKm,
        steps: stepCountRef.current,
      });
      setMessage("Activity saved successfully.");
      console.log("Activity saved:", activityId);
      
      // Navigate immediately to the clean summary screen
      setIsTracking(false);
      setCoordinates([]);
      coordinatesRef.current = [];
      navigation.navigate("ActivitySummary", { 
        activity: { ...payload, id: activityId } 
      });
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
      const firstTimestamp = Number(initialLocation?.timestamp || Date.now());
      const firstPoint = {
        ...initialLocation.coords,
        timestamp: firstTimestamp,
      };

      setCoordinates([firstPoint]);
      coordinatesRef.current = [firstPoint];
      startedAtRef.current = Date.now();
      resumedAtMsRef.current = Date.now();
      activeAccumMsRef.current = 0;
      lastValidPointRef.current = firstPoint;
      lastObservedPointRef.current = firstPoint;
      lastMovementAtMsRef.current = firstTimestamp;
      isPausedRef.current = false;
      pauseReasonRef.current = null;
      autoPauseCountRef.current = 0;
      manualPauseCountRef.current = 0;
      stepCountRef.current = 0;
      pendingStepBatchRef.current = 0;
      stepBatchesRef.current = [];
      lastStepBatchAtMsRef.current = firstTimestamp;
      segmentPacesRef.current = [];
      setActiveSeconds(0);
      setTotalSteps(0);
      setSmoothedPaceMinPerKm(0);
      setIsPaused(false);
      setPauseReason(null);
      console.log("GPS:", firstPoint.latitude, firstPoint.longitude);

      await startLocationWatch();
      setIsTracking(true);
    } catch (err) {
      setError(err.message || "Unable to start activity tracking.");
    }
  };

  const resumeTracking = async () => {
    try {
      setError("");
      const now = Date.now();
      resumedAtMsRef.current = now;
      lastMovementAtMsRef.current = now;
      setIsPaused(false);
      setPauseReason(null);
      isPausedRef.current = false;
      pauseReasonRef.current = null;

      if (!locationSubscriptionRef.current) {
        await startLocationWatch();
      }
    } catch (err) {
      setError(err.message || "Unable to resume activity tracking.");
    }
  };

  useEffect(() => {
    if (!isTracking) {
      return undefined;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const startedAt = startedAtRef.current || now;
      const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
      const activeMs =
        activeAccumMsRef.current + (resumedAtMsRef.current ? now - resumedAtMsRef.current : 0);
      const active = Math.max(0, Math.floor(activeMs / 1000));

      setActiveSeconds(active);

      if (!isPaused && lastMovementAtMsRef.current) {
        const idleForMs = now - lastMovementAtMsRef.current;
        if (idleForMs >= AUTO_PAUSE_IDLE_MS) {
          pauseTracking("auto");
          setMessage("Auto-paused due to inactivity.");
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, isPaused, pauseTracking]);

  useEffect(() => {
    return () => {
      // Prevent leak when leaving this screen.
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
      if (Platform.OS !== "web") {
        stopBackgroundLocationUpdates();
      }
    };
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "background-location-update",
      (locations) => {
        if (locations && locations.length > 0) {
          locations.forEach((loc) => handleNewLocation(loc));
        }
      }
    );
    return () => subscription.remove();
  }, [handleNewLocation]);

  return (
    <View style={styles.container}>
      {/* Full Screen Map Background */}
      {Platform.OS !== "web" && MapView ? (
        <MapView
          style={StyleSheet.absoluteFillObject}
          showsUserLocation
          followsUserLocation={isTracking && !isPaused}
          initialRegion={{
            latitude: coordinates[0]?.latitude || 37.7749,
            longitude: coordinates[0]?.longitude || -122.4194,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          userInterfaceStyle="dark"
        >
          {coordinates.length > 0 && (
            <Polyline
              coordinates={coordinates}
              strokeColor={theme.colors.primary}
              strokeWidth={4}
            />
          )}

          {coordinates.length > 0 && (
            <Marker
              coordinate={coordinates[coordinates.length - 1]}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.avatarMarkerContainer}>
                <Image 
                  source={getAvatarSource(avatarId)} 
                  style={styles.avatarMarkerImage} 
                />
                <View style={styles.avatarMarkerPulse} />
              </View>
            </Marker>
          )}
        </MapView>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.surface, justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ color: theme.colors.text.tertiary, ...theme.typography.caption }}>Map preview not available on web</Text>
        </View>
      )}

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topOverlay}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {/* Bottom Panel */}
        <View style={styles.bottomPanel}>
          {!isTracking && (
            <View style={styles.typeSelectorContainer}>
              {ACTIVITY_TYPES.map((type) => {
                const isSelected = activityType === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => setActivityType(type.value)}
                    disabled={isTracking || isSaving}
                    style={[
                      styles.typeButton,
                      isSelected && styles.typeButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        isSelected && styles.typeButtonTextSelected
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.timerSection}>
            <TimerDisplay seconds={activeSeconds} />
            {isPaused && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  PAUSED ({pauseReason === "auto" ? "AUTO" : "MANUAL"})
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <StatCard 
              label="Distance" 
              value={stats ? (stats.distanceMeters / 1000).toFixed(2) : (calculateTotalDistance(coordinates) / 1000).toFixed(2)} 
              unit="km" 
            />
            <StatCard 
              label="Pace" 
              value={stats ? stats.smoothedPaceMinPerKm.toFixed(2) : smoothedPaceMinPerKm.toFixed(2)} 
              unit="/km" 
              highlight 
            />
          </View>

          <View style={styles.controlsContainer}>
            {!isTracking ? (
              <PrimaryButton 
                title="Start Activity" 
                icon="play" 
                onPress={startTracking}
                disabled={isSaving}
              />
            ) : (
              <View style={styles.activeControlsRow}>
                <FloatingActionButton 
                  icon={isPaused ? "play" : "pause"} 
                  onPress={isPaused ? resumeTracking : () => pauseTracking("manual")} 
                />
                <PrimaryButton 
                  title="Finish" 
                  onPress={stopTracking}
                  disabled={isSaving}
                  style={styles.finishButton}
                />
              </View>
            )}
            {isSaving && <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
  },
  topOverlay: {
    marginTop: theme.spacing.xl,
    alignItems: "center",
    marginHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  bottomPanel: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : theme.spacing.xl,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  timerSection: {
    alignItems: "center",
    marginVertical: theme.spacing.md,
  },
  controlsContainer: {
    marginTop: theme.spacing.sm,
  },
  activeControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xl,
    width: "100%",
  },
  finishButton: {
    // Compact width based on content
  },
  typeSelectorContainer: {
    flexDirection: "row",
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    overflow: "hidden",
    gap: 1,
  },
  typeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  typeButtonSelected: {
    backgroundColor: theme.colors.primary,
  },
  typeButtonText: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  typeButtonTextSelected: {
    color: theme.colors.background,
  },
  statusBadge: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: 2,
    marginTop: theme.spacing.sm,
  },
  statusText: {
    ...theme.typography.caption,
    color: theme.colors.text.inverse,
    fontSize: 10,
    fontWeight: "700",
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMarkerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarMarkerImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarMarkerPulse: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    opacity: 0.3,
  },
});

export default TrackActivityScreen;
