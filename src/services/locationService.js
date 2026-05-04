import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

export const LOCATION_TRACKING_TASK = "BACKGROUND_LOCATION_TRACKING";

export const requestLocationPermission = async () => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== "granted") return false;

  // Background permission is only required for Native (iOS/Android)
  if (Platform.OS !== "web") {
    try {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      // We return true if foreground is granted, even if background isn't 
      // (though background features will be disabled by the OS)
      return foregroundStatus === "granted";
    } catch (e) {
      console.warn("Background permission request failed:", e);
    }
  }

  return foregroundStatus === "granted";
};

export const getCurrentLocation = async () => {
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
  });
};

export const watchLocation = async (callback) => {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 1,
    },
    callback
  );
};

export const startBackgroundLocationUpdates = async () => {
  return Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,
    distanceInterval: 1,
    foregroundService: {
      notificationTitle: "Pace Tracking Active",
      notificationBody: "Tracking your activity in the background.",
      notificationColor: "#00E5FF",
    },
    pausesLocationUpdatesAutomatically: false,
  });
};

export const stopBackgroundLocationUpdates = async () => {
  const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
  if (isStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
  }
};
