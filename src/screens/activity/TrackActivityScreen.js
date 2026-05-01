import React, { useCallback, useEffect, useRef, useState } from "react";
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
const MIN_DISTANCE_METERS = 1.5;
const MIN_REQUIRED_ACCURACY_METERS = 40;
const MAX_STEP_CADENCE_INTERVAL_MS = 2000;
const MIN_STEP_CADENCE_INTERVAL_MS = 250;
const AUTO_PAUSE_IDLE_MS = 3000;
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

const TrackActivityScreen = () => {
  const [activityType, setActivityType] = useState("walk");
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [coordinates, setCoordinates] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [stats, setStats] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
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

  const startLocationWatch = async () => {
    if (locationSubscriptionRef.current) {
      return;
    }

    const subscription = await watchLocation((location) => {
      const nextPoint = location.coords;
      const timestampMs = Number(location?.timestamp || Date.now());
      const pointWithTimestamp = {
        ...nextPoint,
        timestamp: timestampMs,
      };

      const previousObservedPoint = lastObservedPointRef.current;
      lastObservedPointRef.current = pointWithTimestamp;
      setCurrentLocation(nextPoint);

      if (isPausedRef.current && pauseReasonRef.current === "auto") {
        if (isMeaningfulMovement(previousObservedPoint, pointWithTimestamp, timestampMs)) {
          lastValidPointRef.current = pointWithTimestamp;
          resumeFromAutoPause(timestampMs);
        }
        return;
      }

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
        const stepCount = Math.max(1, Math.floor(movedMeters / MIN_DISTANCE_METERS));
        const generatedPoints = [];
        for (let i = 1; i <= stepCount; i += 1) {
          const ratio = i / stepCount;
          generatedPoints.push(interpolatePoint(lastPoint, pointWithTimestamp, ratio));
        }

        const next = [...prev, ...generatedPoints];
        coordinatesRef.current = next;
        return next;
      });
    });

    locationSubscriptionRef.current = subscription;
  };

  const stopTracking = async () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
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
      const firstTimestamp = Number(initialLocation?.timestamp || Date.now());
      const firstPoint = {
        ...initialLocation.coords,
        timestamp: firstTimestamp,
      };

      setCurrentLocation(firstPoint);
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
      setElapsedSeconds(0);
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

      setElapsedSeconds(elapsed);
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
        <>
          {isPaused ? (
            <Button title="Resume Activity" onPress={resumeTracking} />
          ) : (
            <Button title="Pause Activity" onPress={() => pauseTracking("manual")} />
          )}
          <Button
            title={isSaving ? "Saving..." : "Stop Activity"}
            onPress={stopTracking}
            disabled={isSaving}
          />
        </>
      )}

      {error ? <Text style={{ color: "red" }}>{error}</Text> : null}
      {message ? <Text style={{ color: "green" }}>{message}</Text> : null}
      {isSaving ? <Text>Saving activity...</Text> : null}
      {isPaused ? (
        <Text style={{ color: "#B45309" }}>
          Paused ({pauseReason === "auto" ? "auto-pause" : "manual pause"})
        </Text>
      ) : null}

      <Text>Points collected: {coordinates.length}</Text>
      <Text>Elapsed time: {formatDuration(elapsedSeconds)}</Text>
      <Text>Active time: {formatDuration(activeSeconds)}</Text>
      <Text>Steps (filtered): {totalSteps}</Text>

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
          <Text>Elapsed: {formatDuration(stats.elapsedTimeSeconds)}</Text>
          <Text>Active: {formatDuration(stats.activeTimeSeconds)}</Text>
          <Text>Pace: {stats.paceMinPerKm.toFixed(2)} min/km</Text>
          <Text>Smoothed pace: {stats.smoothedPaceMinPerKm.toFixed(2)} min/km</Text>
          <Text>Steps: {stats.steps}</Text>
        </>
      ) : null}
    </View>
  );
};

export default TrackActivityScreen;
