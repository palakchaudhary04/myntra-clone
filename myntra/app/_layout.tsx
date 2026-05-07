import { DarkTheme, DefaultTheme, ThemeProvider as NavProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router"; // Added useRouter
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react"; // Added useRef
import * as Notifications from "expo-notifications"; // Added Notifications
import "react-native-reanimated";
import React from "react";

import { AuthProvider, useAuth } from "@/context/AuthContext"; // Import useAuth
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { registerForPushNotificationsAsync } from "@/utils/notifications"; // We'll create this file next

SplashScreen.preventAutoHideAsync();

// Configure how notifications look when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <InnerLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

function InnerLayout() {
  const { themeMode } = useTheme();
  const { user } = useAuth(); // Get user to register token
  const router = useRouter();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // 1. Register for Notifications if user is logged in
    if (user?._id) {
      registerForPushNotificationsAsync(user._id);
    }

    // 2. Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification Received in Foreground:", notification);
    });

    // 3. Listen for user interacting with (tapping) notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const { url } = response.notification.request.content.data;
      
      // If the notification has a URL (like /orders), navigate there
      if (url) {
        router.push(url);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  return (
    <NavProvider value={themeMode === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        {/* Ensure your new routes are registered here if not using auto-discovery */}
        <Stack.Screen name="orders" options={{ headerShown: true, title: "My Orders" }} />
        <Stack.Screen name="payments" options={{ headerShown: true, title: "Payments" }} />
      </Stack>
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
    </NavProvider>
  );
}