import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ActivityDetailScreen from "../screens/activity/ActivityDetailScreen";
import ActivitySummaryScreen from "../screens/activity/ActivitySummaryScreen";
import MainBottomTabs from "./MainBottomTabs";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainBottomTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ActivityDetail"
        component={ActivityDetailScreen}
        options={{ title: "Activity Details", presentation: "modal" }}
      />
      <Stack.Screen
        name="ActivitySummary"
        component={ActivitySummaryScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
