import { Platform } from "react-native";

export const theme = {
  colors: {
    primary: "#C5F135",       // Lime — main accent
    primaryLight: "rgba(197,241,53,0.15)",
    primaryDark: "#8BAF22",   // Dim lime
    secondary: "#F97316",     // Orange — HR / tempo data
    secondaryDim: "rgba(249,115,22,0.2)",
    accent: "#3B82F6",        // Blue — Z1 / Long run
    success: "#22C55E",       // Green — Z2 / Easy
    danger: "#EF4444",        // Red — Z5 / errors
    warning: "#EAB308",       // Yellow — Z3
    error: "#EF4444",
    background: "#0C0D11",    // Very deep dark
    surface: "#13151C",       // Slightly lighter
    surfaceHighlight: "#1A1D27",
    surfaceDeep: "#1E2130",
    border: "rgba(255,255,255,0.07)",
    borderHighlight: "rgba(255,255,255,0.12)",
    text: {
      primary: "#F0F0F0",
      secondary: "#9A9DAA",
      tertiary: "#5A5D6E",
      inverse: "#0C0D11",
    },
    // Zone colors
    z1: "#3B82F6",
    z2: "#22C55E",
    z3: "#EAB308",
    z4: "#F97316",
    z5: "#EF4444",
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
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },
  typography: {
    h1: { fontSize: 28, fontWeight: "600", color: "#F0F0F0", letterSpacing: -1 },
    h2: { fontSize: 22, fontWeight: "500", color: "#F0F0F0", letterSpacing: -0.5 },
    h3: { fontSize: 16, fontWeight: "600", color: "#F0F0F0", letterSpacing: -0.2 },
    body: { fontSize: 13, color: "#9A9DAA", lineHeight: 20 },
    caption: {
      fontSize: 9,
      color: "#5A5D6E",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 1.5,
    },
    mono: {
      fontFamily: Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" }),
      fontSize: 14,
      color: "#F0F0F0",
    },
    button: { fontSize: 14, fontWeight: "700", color: "#0C0D11" },
  },
  shadows: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 5,
    },
    glow: {
      shadowColor: "#C5F135",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 4,
    },
    button: {
      shadowColor: "#C5F135",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 2,
    },
  },
};
