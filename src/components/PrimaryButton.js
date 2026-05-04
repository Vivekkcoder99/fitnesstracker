import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator as RNActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

const PrimaryButton = ({ title, onPress, icon, disabled, loading, style }) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <RNActivityIndicator size="small" color={theme.colors.text.inverse} />
      ) : (
        <>
          {icon && (
            <Ionicons name={icon} size={18} color={theme.colors.text.inverse} style={styles.icon} />
          )}
          <Text style={styles.text}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  text: {
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

export default PrimaryButton;
