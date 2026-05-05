import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator as RNActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

const PrimaryButton = ({ title, onPress, icon, disabled, loading, style }) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <RNActivityIndicator size="small" color={theme.colors.text.inverse} />
      ) : (
        <View style={styles.inner}>
          {icon && (
            <Ionicons name={icon} size={18} color={theme.colors.text.inverse} style={styles.icon} />
          )}
          <Text style={styles.text}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 15,
    paddingHorizontal: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    ...theme.shadows.button,
  },
  disabled: {
    opacity: 0.45,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: {},
  text: {
    color: theme.colors.text.inverse,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

export default PrimaryButton;
