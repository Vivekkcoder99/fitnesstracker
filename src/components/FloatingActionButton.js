import React from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Circle, Path, G, Rect } from "react-native-svg";
import { theme } from "../theme";

const FloatingActionButton = ({ onPress, icon, size = 60 }) => {
  // Use the custom gradient colors from the image
  const gradientColors = ["#00B4D8", "#03045E"];

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="grad" x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="1" />
              <Stop offset="100%" stopColor={gradientColors[1]} stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Background Circle with Shadow-like effect */}
          <Circle cx="50" cy="50" r="48" fill="url(#grad)" />

          {/* Combined Play/Pause Icon */}
          <G transform="translate(28, 32)">
            {/* Play Triangle */}
            <Path
              d="M0 0 L22 18 L0 36 Z"
              fill="white"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Pause Bars */}
            <Rect x="30" y="0" width="5" height="36" rx="2.5" fill="white" />
            <Rect x="42" y="0" width="5" height="36" rx="2.5" fill="white" />
          </G>
        </Svg>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadows.button,
  },
});

export default FloatingActionButton;
