import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../config/firebase";
import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";

const RootNavigator = () => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!auth) {
      setInitializing(false);
      return;
    }

    // Listen for Firebase auth state changes.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <ActivityIndicator size="large" />
        <Text>Checking login status...</Text>
      </View>
    );
  }

  if (!isFirebaseConfigured) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "600" }}>
          Firebase not configured
        </Text>
        <Text style={{ textAlign: "center" }}>
          Create a .env file in the project root and add your
          EXPO_PUBLIC_FIREBASE_* keys.
        </Text>
      </View>
    );
  }

  return user ? <AppNavigator /> : <AuthNavigator />;
};

export default RootNavigator;
