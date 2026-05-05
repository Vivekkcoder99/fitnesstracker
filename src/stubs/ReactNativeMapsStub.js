// Web stub for react-native-maps
// Native platforms use the real package; web gets this no-op.
import React from 'react';
import { View, Text } from 'react-native';

const MapView = ({ children, style }) => (
  <View style={[{ backgroundColor: '#13151C', alignItems: 'center', justifyContent: 'center' }, style]}>
    <Text style={{ color: '#5A5D6E', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
      Map not available on web
    </Text>
    {children}
  </View>
);

const Polyline = () => null;
const Marker = ({ children }) => <>{children}</>;
const Circle = () => null;
const Polygon = () => null;
const Callout = () => null;

MapView.Animated = MapView;
MapView.Polyline = Polyline;
MapView.Marker = Marker;
MapView.Circle = Circle;
MapView.Polygon = Polygon;
MapView.Callout = Callout;

export { Polyline, Marker, Circle, Polygon, Callout };
export default MapView;
