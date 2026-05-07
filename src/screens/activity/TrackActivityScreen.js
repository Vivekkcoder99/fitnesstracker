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

const SAVE_TIMEOUT_MS = 12000;
const MIN_DISTANCE_METERS = 3.0;
const MIN_REQUIRED_ACCURACY_METERS = 100;
const AUTO_PAUSE_IDLE_MS = 15000;
const PACE_SMOOTHING_WINDOW = 5;
const WORKOUT_TYPES = [
  { label: "Easy", value: "easy" },
  { label: "Tempo", value: "tempo" },
  { label: "Long", value: "long" },
  { label: "Free", value: "free" },
];
const ACTIVITY_TYPES = [
  { label: "Walk", value: "walk" },
  { label: "Run", value: "run" },
  { label: "Cycle", value: "cycle" },
];
const PACE_ZONES = [
  { label: "Z1", name: "Easy",  color: "#3B82F6",  bgAlpha: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)" },
  { label: "Z2", name: "Base",  color: "#22C55E",  bgAlpha: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.3)" },
  { label: "Z3", name: "Tempo", color: "#EAB308",  bgAlpha: "rgba(234,179,8,0.15)",   border: "rgba(234,179,8,0.4)" },
  { label: "Z4", name: "Hard",  color: "#F97316",  bgAlpha: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.3)" },
  { label: "Z5", name: "Max",   color: "#EF4444",  bgAlpha: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)" },
];
const TARGET_MODES = [
  { label: "Distance", value: "distance", unit: "km", defaultVal: "10.0" },
  { label: "Duration", value: "duration", unit: "min", defaultVal: "60" },
  { label: "Open", value: "open", unit: "", defaultVal: "—" },
];

const MIN_ACTIVITY_DURATION_SECONDS = 10;
const MIN_ACTIVITY_DISTANCE_METERS = 10;
const MAX_SAVE_RETRIES = 3;

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
  const [activityType, setActivityType] = useState("run");
  const [workoutType, setWorkoutType] = useState("easy");
  const [autoPauseEnabled, setAutoPauseEnabled] = useState(true);
  const [targetMode, setTargetMode] = useState("open");
  const [targetValue, setTargetValue] = useState("");
  const [gpsReady, setGpsReady] = useState(false);
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
  // totalSteps state removed
  const [smoothedPaceMinPerKm, setSmoothedPaceMinPerKm] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const isProcessingRef = useRef(false);
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
  const segmentPacesRef = useRef([]);
  const mapRef = useRef(null);

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
    if (autoPauseEnabled && speedMps < bounds.minActiveMps) {
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



    lastValidPointRef.current = nextPoint;
    lastMovementAtMsRef.current = timestampMs;
    return { accepted: true, movedMeters, speedMps };
  };

  const handleNewLocation = useCallback((location) => {
    const nextPoint = { ...location.coords };
    if (nextPoint.accuracy === undefined || nextPoint.accuracy === null) {
      nextPoint.accuracy = 5;
    }

    const timestampMs = Number(location?.timestamp || Date.now());

    // On Web, simulate tiny GPS drift over time so that tests/simulations register movement, distance, and speeds
    if (Platform.OS === "web" && startedAtRef.current) {
      const elapsedSec = (timestampMs - startedAtRef.current) / 1000;
      const driftLat = elapsedSec * 0.00003;
      const driftLng = elapsedSec * 0.00003;
      nextPoint.latitude = (nextPoint.latitude || 37.7749) + driftLat;
      nextPoint.longitude = (nextPoint.longitude || -122.4194) + driftLng;
    }

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
      if (result.reason === "low_accuracy") {
        setMessage("Tracking works best in open spaces. Try stepping outside.");
      } else if (result.reason === "jitter") {
        setMessage("We’re not detecting movement. Try moving in a straight path.");
      } else if (result.reason === "stationary") {
        setMessage("Move a bit faster to start tracking.");
      }
      return;
    }

    setMessage("");

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
    try {
      if (locationSubscriptionRef.current) {
        return;
      }

      const subscription = await watchLocation(handleNewLocation);
      locationSubscriptionRef.current = subscription;
      
      if (Platform.OS !== "web") {
        try {
          await startBackgroundLocationUpdates();
        } catch (bgErr) {
          console.warn(
            "Background location updates not supported/configured on this device (e.g. Expo Go on physical device). Falling back to foreground-only mode.",
            bgErr
          );
        }
      }
    } catch (err) {
      console.error("Failed to start location watch:", err);
      throw new Error("Please enable location access in your device settings to start tracking.");
    }
  };

  const stopTracking = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
      
      if (Platform.OS !== "web") {
        try {
          await stopBackgroundLocationUpdates();
        } catch (stopBgErr) {
          console.warn("Could not stop background location (might not have started successfully):", stopBgErr);
        }
      }
      
      const routePoints = coordinatesRef.current;
      const distanceMeters = calculateTotalDistance(routePoints);
      const endedAt = Date.now();
      const elapsedSeconds = Math.floor((endedAt - (startedAtRef.current || endedAt)) / 1000);

      // Prevent saving empty or extremely short activities
      if (elapsedSeconds < MIN_ACTIVITY_DURATION_SECONDS || distanceMeters < MIN_ACTIVITY_DISTANCE_METERS) {
        setIsTracking(false);
        setIsPaused(false);
        setPauseReason(null);
        isPausedRef.current = false;
        pauseReasonRef.current = null;
        setCoordinates([]);
        coordinatesRef.current = [];
        Alert.alert("Activity too short", "Activity too short to save");
        isProcessingRef.current = false;
        return;
      }

      setIsTracking(false);
      setIsPaused(false);
      setPauseReason(null);
      isPausedRef.current = false;
      pauseReasonRef.current = null;
      setIsSaving(true);
      setError("");
      setMessage("");

      const userId = auth?.currentUser?.uid;
      if (!userId) {
        throw new Error("You must be logged in to save activity.");
      }

      if (resumedAtMsRef.current) {
        activeAccumMsRef.current += endedAt - resumedAtMsRef.current;
        resumedAtMsRef.current = null;
      }

      // flushStepBatch removed – no step batch processing
      const elapsedTimeSeconds = Math.max(1, elapsedSeconds);
      const activeTimeSeconds = Math.max(1, Math.floor(activeAccumMsRef.current / 1000));
      const pausedTimeSeconds = Math.max(0, elapsedTimeSeconds - activeTimeSeconds);
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
        workoutType,
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

      // Generate a unique ID for this activity to prevent duplicates during retries
      const activityId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      let savedId = null;
      let retryCount = 0;
      let lastErr = null;

      while (retryCount < MAX_SAVE_RETRIES && !savedId) {
        try {
          savedId = await Promise.race([
            saveActivity(userId, payload, activityId),
            new Promise((_, reject) => {
              setTimeout(() => {
                reject(new Error("Save timed out. Check internet or Firestore rules."));
              }, SAVE_TIMEOUT_MS);
            }),
          ]);
        } catch (err) {
          lastErr = err;
          retryCount++;
          if (retryCount < MAX_SAVE_RETRIES) {
            console.log(`Save failed, retrying (${retryCount}/${MAX_SAVE_RETRIES})...`);
            setMessage("Saving failed, will retry automatically...");
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!savedId) {
        throw lastErr || new Error("Failed to save after multiple attempts.");
      }

      setStats({
        activityType,
        elapsedTimeSeconds,
        activeTimeSeconds,
        distanceMeters,
        paceMinPerKm,
        smoothedPaceMinPerKm: smoothedPaceMinPerKm || paceMinPerKm,
      });
      setMessage("Activity saved successfully.");
      
      setCoordinates([]);
      coordinatesRef.current = [];
      navigation.navigate("ActivitySummary", { 
        activity: { ...payload, id: savedId } 
      });
    } catch (err) {
      console.log("Save activity error:", err?.code, err?.message);
      let errorMsg = err.message || "Failed to save activity.";
      if (err?.code === "permission-denied") {
        errorMsg = "Firestore permission denied. Check Firestore rules.";
      } else if (err?.code === "failed-precondition") {
        errorMsg = "Firestore is not enabled yet.";
      }
      setError(errorMsg);
      Alert.alert("Save failed", errorMsg);
    } finally {
      setIsSaving(false);
      isProcessingRef.current = false;
    }
  };

  const startTracking = () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Reset all state synchronously
    setError("");
    setMessage("Preparing tracking...");
    setStats(null);
    setPermissionDenied(false);
    activeAccumMsRef.current = 0;
    isPausedRef.current = false;
    pauseReasonRef.current = null;
    autoPauseCountRef.current = 0;
    manualPauseCountRef.current = 0;
    segmentPacesRef.current = [];
    lastValidPointRef.current = null;
    lastObservedPointRef.current = null;
    lastMovementAtMsRef.current = null;
    startedAtRef.current = Date.now();
    resumedAtMsRef.current = Date.now();
    coordinatesRef.current = [];
    setCoordinates([]);
    setActiveSeconds(0);
    setSmoothedPaceMinPerKm(0);
    setIsPaused(false);
    setPauseReason(null);

    // Show the tracking screen instantly – GPS work happens in the useEffect below
    setIsTracking(true);
    isProcessingRef.current = false;
  };


  const resumeTracking = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

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
      Alert.alert("Resume Error", err.message || "Unable to resume activity tracking.");
    } finally {
      isProcessingRef.current = false;
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

      if (autoPauseEnabled && !isPaused && lastMovementAtMsRef.current) {
        const idleForMs = now - lastMovementAtMsRef.current;
        if (idleForMs >= AUTO_PAUSE_IDLE_MS) {
          pauseTracking("auto");
          setMessage("Paused automatically because no movement was detected.");
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, isPaused, pauseTracking, autoPauseEnabled]);

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

  // Async GPS initialisation – runs AFTER the tracking screen has already rendered
  useEffect(() => {
    if (!isTracking) return;

    let cancelled = false;
    const initGps = async () => {
      try {
        const hasPermission = await requestLocationPermission();
        if (cancelled) return;
        if (!hasPermission) {
          setPermissionDenied(true);
          setError("Location is required to track activity");
          setIsTracking(false);
          return;
        }

        const initialLocation = await getCurrentLocation();
        if (cancelled) return;

        const firstCoords = { ...initialLocation.coords };
        if (firstCoords.accuracy === undefined || firstCoords.accuracy === null) {
          firstCoords.accuracy = 5;
        }
        const firstTimestamp = Number(initialLocation?.timestamp || Date.now());
        const firstPoint = { ...firstCoords, timestamp: firstTimestamp };

        lastValidPointRef.current = firstPoint;
        lastObservedPointRef.current = firstPoint;
        lastMovementAtMsRef.current = firstTimestamp;
        coordinatesRef.current = [firstPoint];
        setCoordinates([firstPoint]);

        if (!cancelled) {
          await startLocationWatch();
          setMessage("");
        }
      } catch (err) {
        if (!cancelled) {
          setIsTracking(false);
          setError(err.message || "Unable to start activity tracking.");
          Alert.alert("Tracking Error", err.message || "Unable to start activity tracking.");
        }
      }
    };

    initGps();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTracking]);

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
          {message ? <Text style={styles.messageText}>{message}</Text> : null}
          {permissionDenied && (
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={startTracking}
            >
              <Text style={styles.retryButtonText}>Retry Permission</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* LIVE · AUTO-PAUSE map badge */}
        {isTracking && (
          <View style={styles.mapBadge}>
            <View style={styles.mapBadgeDot} />
            <Text style={styles.mapBadgeText}>
              LIVE · {isPaused ? (pauseReason === "auto" ? "AUTO-PAUSED" : "PAUSED") : (autoPauseEnabled ? "AUTO-PAUSE ON" : "AUTO-PAUSE OFF")}
            </Text>
          </View>
        )}

        {/* Bottom Panel */}
        <View style={styles.bottomPanel}>
          {!isTracking ? (
            /* ─── PRE-RUN SETUP ─────────────────────────── */
            <View style={styles.preRunContainer}>
              <Text style={styles.preRunTitle}>
                New {activityType === "walk" ? "Walk" : activityType === "cycle" ? "Ride" : "Run"}
              </Text>

              {/* Activity Type Selector */}
              <View style={styles.preRunSection}>
                <Text style={styles.preRunLabel}>ACTIVITY TYPE</Text>
                <View style={styles.workoutChips}>
                  {ACTIVITY_TYPES.map((at) => {
                    const active = activityType === at.value;
                    return (
                      <TouchableOpacity
                        key={at.value}
                        onPress={() => setActivityType(at.value)}
                        disabled={isSaving}
                        style={[styles.workoutChip, active && styles.workoutChipActive]}
                      >
                        <Text style={[styles.workoutChipText, active && styles.workoutChipTextActive]}>
                          {at.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Workout Type Chips */}
              <View style={styles.preRunSection}>
                <Text style={styles.preRunLabel}>WORKOUT TYPE</Text>
                <View style={styles.workoutChips}>
                  {WORKOUT_TYPES.map((wt) => {
                    const active = workoutType === wt.value;
                    return (
                      <TouchableOpacity
                        key={wt.value}
                        onPress={() => setWorkoutType(wt.value)}
                        disabled={isSaving}
                        style={[styles.workoutChip, active && styles.workoutChipActive]}
                      >
                        <Text style={[styles.workoutChipText, active && styles.workoutChipTextActive]}>
                          {wt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Target Row */}
              <View style={styles.preRunSection}>
                <Text style={styles.preRunLabel}>TARGET</Text>
                <View style={styles.targetRow}>
                  {TARGET_MODES.map((tm) => {
                    const active = targetMode === tm.value;
                    return (
                      <TouchableOpacity
                        key={tm.value}
                        onPress={() => setTargetMode(tm.value)}
                        style={[styles.targetChip, active && styles.targetChipActive]}
                      >
                        <Text style={styles.targetChipLabel}>{tm.label}</Text>
                        <Text style={[styles.targetChipVal, active && styles.targetChipValActive]}>
                          {tm.defaultVal}
                          {tm.unit ? (
                            <Text style={[styles.targetChipUnit, active && styles.targetChipUnitActive]}>
                              {" "}{tm.unit}
                            </Text>
                          ) : null}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Pace Zone Selector */}
              <View style={styles.preRunSection}>
                <Text style={styles.preRunLabel}>PACE ZONE</Text>
                <View style={styles.zoneChipsRow}>
                  {PACE_ZONES.map((z) => (
                    <View
                      key={z.label}
                      style={[
                        styles.zoneChip,
                        { backgroundColor: z.bgAlpha, borderColor: z.border },
                      ]}
                    >
                      <Text style={[styles.zoneChipLabel, { color: z.color }]}>{z.label}</Text>
                      <Text style={styles.zoneChipName}>{z.name}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Auto-Pause Toggle */}
              <View style={styles.preRunSection}>
                <Text style={styles.preRunLabel}>AUTO-PAUSE</Text>
                <View style={styles.workoutChips}>
                  <TouchableOpacity
                    onPress={() => setAutoPauseEnabled(true)}
                    disabled={isSaving}
                    style={[styles.workoutChip, autoPauseEnabled && styles.workoutChipActive]}
                  >
                    <Text style={[styles.workoutChipText, autoPauseEnabled && styles.workoutChipTextActive]}>
                      ON (Recommended)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setAutoPauseEnabled(false)}
                    disabled={isSaving}
                    style={[styles.workoutChip, !autoPauseEnabled && styles.workoutChipActive]}
                  >
                    <Text style={[styles.workoutChipText, !autoPauseEnabled && styles.workoutChipTextActive]}>
                      OFF
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* GPS Readiness */}
              <View style={styles.gpsRow}>
                <View style={[styles.gpsDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={styles.gpsText}>Ready to Track</Text>
              </View>

              {/* Start Button */}
              <PrimaryButton
                title={`▶  Start ${activityType === "walk" ? "Walk" : activityType === "cycle" ? "Ride" : "Run"}`}
                onPress={startTracking}
                disabled={isSaving}
              />
            </View>
          ) : (
            /* ─── ACTIVE RUN PANEL ──────────────────────── */
            <View>
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

              {/* Live Pace Zone Needle Bar */}
              <View style={styles.pzWrap}>
                <View style={styles.pzBar}>
                  {PACE_ZONES.map((z) => (
                    <View key={z.label} style={[styles.pzSegment, { backgroundColor: z.color }]} />
                  ))}
                </View>
                {/* Needle position based on smoothed pace */}
                {(() => {
                  const pace = smoothedPaceMinPerKm;
                  let pct = 50;
                  if (pace > 0) {
                    // Map pace to 0-100%: Z1 (>7.5) = left, Z5 (<4.0) = right
                    pct = Math.max(0, Math.min(100, ((7.5 - pace) / 3.5) * 100));
                  }
                  return (
                    <View style={[styles.pzNeedle, { left: `${pct}%` }]} />
                  );
                })()}
                <View style={styles.pzLabels}>
                  {PACE_ZONES.map((z, i) => {
                    const currentPace = smoothedPaceMinPerKm;
                    const zoneIdx = currentPace > 7.5 ? 0 : currentPace > 6.0 ? 1 : currentPace > 5.0 ? 2 : currentPace > 4.0 ? 3 : 4;
                    const isActive = i === zoneIdx && currentPace > 0;
                    return (
                      <Text
                        key={z.label}
                        style={[styles.pzLabel, isActive && { color: z.color, fontWeight: "700" }]}
                      >
                        {z.label}{isActive ? " ◀" : ""}
                      </Text>
                    );
                  })}
                </View>
              </View>

              <View style={styles.controlsContainer}>
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
                {isSaving && <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />}
              </View>
            </View>
          )}
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
    marginTop: Platform.OS === "ios" ? 75 : theme.spacing.xl,
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
    borderTopColor: theme.colors.border,
  },
  errorText: {
    color: theme.colors.error,
    ...theme.typography.caption,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  messageText: {
    color: theme.colors.primary,
    ...theme.typography.caption,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  retryButtonText: {
    color: theme.colors.text.primary,
    ...theme.typography.button,
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
    flex: 1,
    width: "auto",
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

  /* ─── Map Badge ─────────────────────────────────────── */
  mapBadge: {
    position: "absolute",
    top: Platform.OS === "ios" ? 100 : 60,
    left: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(12,13,17,0.75)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    zIndex: 10,
  },
  mapBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  mapBadgeText: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 9,
    color: theme.colors.primary,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  /* ─── Pre-Run Setup ─────────────────────────────────── */
  preRunContainer: { gap: theme.spacing.md },
  preRunTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  preRunSection: { gap: 6 },
  preRunLabel: {
    fontSize: 9,
    color: theme.colors.text.tertiary,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  /* Workout type chips */
  workoutChips: {
    flexDirection: "row",
    gap: 6,
  },
  workoutChip: {
    flex: 1,
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 9,
    alignItems: "center",
  },
  workoutChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  workoutChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.text.secondary,
  },
  workoutChipTextActive: {
    color: theme.colors.text.inverse,
  },

  /* Target row */
  targetRow: {
    flexDirection: "row",
    gap: 6,
  },
  targetChip: {
    flex: 1,
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: 10,
    alignItems: "center",
  },
  targetChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "rgba(197,241,53,0.08)",
  },
  targetChipLabel: {
    fontSize: 8,
    color: theme.colors.text.tertiary,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  targetChipVal: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.secondary,
  },
  targetChipValActive: {
    color: theme.colors.text.primary,
  },
  targetChipUnit: {
    fontSize: 10,
    color: theme.colors.text.tertiary,
    fontFamily: theme.typography.mono.fontFamily,
  },
  targetChipUnitActive: {
    color: theme.colors.primary,
  },

  /* Zone chips (pre-run) */
  zoneChipsRow: {
    flexDirection: "row",
    gap: 5,
  },
  zoneChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: theme.borderRadius.xs,
    paddingVertical: 8,
    alignItems: "center",
    gap: 2,
  },
  zoneChipLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  zoneChipName: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 10,
    color: theme.colors.text.secondary,
  },

  /* GPS readiness */
  gpsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsText: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: "600",
  },

  /* ─── Live Pace Zone Bar (Active Run) ───────────────── */
  pzWrap: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  pzBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    gap: 1,
  },
  pzSegment: {
    flex: 1,
    height: "100%",
  },
  pzNeedle: {
    position: "absolute",
    top: -2,
    width: 3,
    height: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 1,
    marginLeft: -1,
  },
  pzLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  pzLabel: {
    fontSize: 8,
    color: theme.colors.text.tertiary,
    fontFamily: theme.typography.mono.fontFamily,
    fontWeight: "500",
  },
});

export default TrackActivityScreen;
