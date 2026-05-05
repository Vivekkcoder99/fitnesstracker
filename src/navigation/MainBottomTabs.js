import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

import HomeScreen from "../screens/home/HomeScreen";
import TrackActivityScreen from "../screens/activity/TrackActivityScreen";
import HistoryScreen from "../screens/history/HistoryScreen";
import StatsScreen from "../screens/stats/StatsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

const Tab = createBottomTabNavigator();

const MainBottomTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "600",
          letterSpacing: 0.5,
          marginTop: -2,
        },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingTop: 8,
          height: 68,
          paddingBottom: 8,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Today",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size - 2} />
          ),
        }}
      />
      <Tab.Screen
        name="Track"
        component={TrackActivityScreen}
        options={{
          tabBarLabel: "Run",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio-button-on" color={color} size={size + 2} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size - 2} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: "Trends",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" color={color} size={size - 2} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size - 2} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainBottomTabs;
