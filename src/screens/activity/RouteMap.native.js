import React from "react";
import { View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

const RouteMap = ({ routeCoordinates, routeRegion, startPoint, endPoint }) => (
  <View style={{ borderRadius: 8, overflow: "hidden" }}>
    <MapView
      style={{ width: "100%", height: 260 }}
      provider={PROVIDER_GOOGLE}
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
);

export default RouteMap;
