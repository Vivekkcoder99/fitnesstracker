import { Platform } from "react-native";

export const theme = {
  colors: {
    primary: "#00E5FF", // Neon Cyan
    primaryLight: "rgba(0, 229, 255, 0.12)",
    primaryDark: "#00B3CC",
    secondary: "#FF007F", // Neon Pink
    accent: "#7D2AE8", // Deep Purple
    success: "#00FFAA", // Neon Green
    danger: "#FF3B30", 
    warning: "#FFD60A",
    background: "#09090E", // Very Deep Dark Blue/Black
    surface: "#141420", // Slightly lighter cool surface
    surfaceHighlight: "#1F1F30",
    border: "rgba(255, 255, 255, 0.08)",
    text: {
      primary: "#FFFFFF",
      secondary: "rgba(255, 255, 255, 0.75)",
      tertiary: "rgba(255, 255, 255, 0.4)",
      inverse: "#000000",
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 12,
    md: 24,
    lg: 32,
    full: 9999,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: "600", color: "#FFFFFF", letterSpacing: -1 },
    h2: { fontSize: 24, fontWeight: "500", color: "#FFFFFF", letterSpacing: -0.5 },
    h3: { fontSize: 18, fontWeight: "500", color: "#FFFFFF", letterSpacing: -0.2 },
    body: { fontSize: 15, color: "rgba(255, 255, 255, 0.82)", lineHeight: 22 },
    caption: { fontSize: 11, color: "rgba(255, 255, 255, 0.45)", fontWeight: "500", textTransform: "uppercase", letterSpacing: 1.5 },
    mono: { fontFamily: Platform.OS === 'ios' ? 'JetBrains Mono' : 'monospace', fontSize: 14 },
  },
  shadows: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    button: {
      shadowColor: "#D0FF00",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
  },
};
