import React from "react";
import { Text, View } from "react-native";

const formatCoordinate = (point) =>
  `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;

const RouteMap = ({ routeCoordinates, startPoint, endPoint }) => (
  <View
    style={{
      minHeight: 180,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#CBD5E1",
      backgroundColor: "#F8FAFC",
      justifyContent: "center",
      gap: 8,
      padding: 16,
    }}
  >
    <Text style={{ color: "#0F172A", fontWeight: "700" }}>
      Route captured with {routeCoordinates.length} GPS points
    </Text>
    {startPoint ? (
      <Text style={{ color: "#475569" }}>Start: {formatCoordinate(startPoint)}</Text>
    ) : null}
    {endPoint ? (
      <Text style={{ color: "#475569" }}>Finish: {formatCoordinate(endPoint)}</Text>
    ) : null}
    <Text style={{ color: "#64748B" }}>
      Interactive route maps are available in the mobile app.
    </Text>
  </View>
);

export default RouteMap;
