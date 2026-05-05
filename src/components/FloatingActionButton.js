import React from "react";
import { TouchableOpacity, StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

const FloatingActionButton = ({ onPress, icon, size = 60 }) => {
  const isPause = icon === "pause";
  const iconName = isPause ? "pause" : "play";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        isPause && styles.pauseButton,
      ]}
    >
      <Ionicons
        name={iconName}
        size={size * 0.38}
        color={isPause ? theme.colors.text.primary : theme.colors.text.inverse}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadows.button,
  },
  pauseButton: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
});

export default FloatingActionButton;
