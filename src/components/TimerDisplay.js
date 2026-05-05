import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

const TimerDisplay = ({ seconds, label = "Elapsed Time" }) => {
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (num) => num.toString().padStart(2, "0");

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${pad(minutes)}:${pad(secs)}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.time}>{formatTime(seconds)}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: 48,
    fontWeight: "700",
    color: theme.colors.text.primary,
    letterSpacing: -2,
  },
  label: {
    fontSize: 9,
    color: theme.colors.text.tertiary,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 4,
  },
});

export default TimerDisplay;
