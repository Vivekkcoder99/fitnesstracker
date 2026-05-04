import React from "react";
import { Text, View } from "react-native";
import { theme } from "../../theme";

const formatCoordinate = (point) =>
  `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;

const RouteMap = ({ routeCoordinates, startPoint, endPoint }) => (
  <View
    style={{
      minHeight: 180,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surface,
      justifyContent: "center",
      gap: 8,
      padding: 16,
      ...theme.shadows.card,
    }}
  >
    <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
      Route captured with {routeCoordinates.length} GPS points
    </Text>
    {startPoint ? (
      <Text style={{ color: theme.colors.text.secondary }}>Start: {formatCoordinate(startPoint)}</Text>
    ) : null}
    {endPoint ? (
      <Text style={{ color: theme.colors.text.secondary }}>Finish: {formatCoordinate(endPoint)}</Text>
    ) : null}
    <Text style={{ color: theme.colors.text.tertiary, marginTop: 8 }}>
      Interactive route maps are available in the mobile app.
    </Text>
  </View>
);

export default RouteMap;
