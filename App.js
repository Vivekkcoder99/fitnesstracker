import React, { useEffect } from "react";
import { Platform } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";
import * as TaskManager from "expo-task-manager";
import { DeviceEventEmitter } from "react-native";
import { LOCATION_TRACKING_TASK } from "./src/services/locationService";

import { theme } from "./src/theme";

// Register the background location task
TaskManager.defineTask(LOCATION_TRACKING_TASK, ({ data, error }) => {
  if (error) {
    console.error("Background Location Error:", error);
    return;
  }
  if (data) {
    const { locations } = data;
    // Emit the location update so TrackActivityScreen can listen for it
    DeviceEventEmitter.emit("background-location-update", locations);
  }
});

const NavigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.background,
    text: theme.colors.text.primary,
    border: theme.colors.border,
    notification: theme.colors.primary,
  },
  // fonts is inherited from DefaultTheme — required by React Navigation internally
};

export default function App() {
  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const ensureMeta = (name, content) => {
      let element = document.querySelector(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute("name", name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    const ensureLink = (rel, href) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", rel);
        document.head.appendChild(element);
      }
      element.setAttribute("href", href);
    };

    ensureLink("manifest", "/manifest.json");
    ensureLink("apple-touch-icon", "/assets/images/icon.png");
    ensureMeta("theme-color", "#0C0D11");
    ensureMeta("apple-mobile-web-app-capable", "yes");
    ensureMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    ensureMeta("apple-mobile-web-app-title", "Pace");

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // Ignore registration failures and continue app usage.
        });
      });
    }
  }, []);

  return (
    <NavigationContainer theme={NavigationTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}
