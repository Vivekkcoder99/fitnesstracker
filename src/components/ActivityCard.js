import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { theme } from "../theme";

const ActivityCard = ({ activity, onPress, formatDistance, formatDuration, formatDate, getActivityTypeLabel }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.activityCard,
        pressed && styles.cardPressed
      ]}
    >
      <View style={[
        styles.activityAccentRail,
        { backgroundColor: activity.activityType === 'run' ? theme.colors.primary : activity.activityType === 'cycle' ? theme.colors.accent : theme.colors.secondary }
      ]} />
      
      <View style={styles.activityInfo}>
        <Text style={styles.activityType}>
          {getActivityTypeLabel(activity.activityType)}
        </Text>
        <Text style={styles.activityDate}>
          {formatDate(activity.startedAt || activity.createdAt)}
        </Text>
      </View>
      
      <View style={styles.activityMetrics}>
        <Text style={styles.activityDistance}>{formatDistance(activity.distanceMeters)}</Text>
        <Text style={styles.activityDuration}>{formatDuration(activity.durationSeconds)}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  cardPressed: {
    opacity: 0.8,
  },
  activityAccentRail: {
    width: 4,
    height: "100%",
  },
  activityInfo: {
    flex: 1,
    padding: theme.spacing.md,
  },
  activityType: {
    ...theme.typography.body,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  activityDate: {
    ...theme.typography.caption,
    marginTop: 2,
    textTransform: "none",
  },
  activityMetrics: {
    alignItems: "flex-end",
    padding: theme.spacing.md,
    gap: 2,
  },
  activityDistance: {
    ...theme.typography.mono,
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  activityDuration: {
    ...theme.typography.mono,
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
});

export default ActivityCard;
