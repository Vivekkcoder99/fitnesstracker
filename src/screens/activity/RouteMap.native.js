import React from "react";
import { View, Image, StyleSheet } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { theme } from "../../theme";
import { getAvatarSource } from "../../components/AvatarSelector";

// Standard dark theme for Google Maps
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
];

const RouteMap = ({ routeCoordinates, routeRegion, startPoint, endPoint, avatarId = "avatar_1" }) => (
  <View style={{ flex: 1, overflow: "hidden" }}>
    <MapView
      style={{ width: "100%", height: "100%" }}
      provider={PROVIDER_GOOGLE}
      initialRegion={routeRegion}
      customMapStyle={darkMapStyle}
      scrollEnabled
      zoomEnabled
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <Polyline
        coordinates={routeCoordinates}
        strokeColor={theme.colors.primary}
        strokeWidth={4}
      />
      {startPoint ? (
        <Marker coordinate={startPoint} title="Start" pinColor={theme.colors.success} />
      ) : null}
      {endPoint ? (
        <Marker coordinate={endPoint} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.avatarMarkerContainer}>
            <Image source={getAvatarSource(avatarId)} style={styles.avatarMarkerImage} />
          </View>
        </Marker>
      ) : null}
    </MapView>
  </View>
);

const styles = StyleSheet.create({
  avatarMarkerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarMarkerImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});

export default RouteMap;
