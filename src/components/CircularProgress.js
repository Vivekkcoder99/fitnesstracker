import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../theme';

const CircularProgress = ({
  size = 120,
  strokeWidth = 12,
  progress = 0, // 0 to 1
  color = theme.colors.primary,
  backgroundColor = theme.colors.surfaceHighlight,
  label,
  value,
  unit,
  icon,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - Math.min(progress, 1) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="none"
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={[styles.content, { borderRadius: size / 2 }]}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        {value !== undefined && (
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
        )}
        {label && (
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        )}
        {unit && (
          <Text style={styles.unit} numberOfLines={1}>
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  iconContainer: {
    marginBottom: 2,
  },
  value: {
    ...theme.typography.mono,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  label: {
    ...theme.typography.caption,
    fontSize: 10,
    marginTop: 2,
  },
  unit: {
    ...theme.typography.caption,
    fontSize: 9,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
});

export default CircularProgress;
