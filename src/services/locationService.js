import * as Location from "expo-location";

export const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
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
