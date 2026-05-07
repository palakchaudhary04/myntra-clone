import { ScrollView, TouchableOpacity, StyleSheet, View, Text, } from "react-native"; // Added Text import
import { useRouter } from "expo-router";
import {
  User,
  Package,
  Heart,
  CreditCard,
  MapPin,
  Settings,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react-native";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

const menuItems = [
  { icon: Package, label: "Orders", route: "/orders" },
  { icon: Heart, label: "Wishlist", route: "/wishlist" },
  { icon: CreditCard, label: "Payment Methods", route: "/payments" },
  { icon: MapPin, label: "Addresses", route: "/addresses" },
  { icon: Settings, label: "Settings", route: "/settings" },
  { icon: CreditCard, label: "My Transactions", route: "/transactions" }, // New!
];

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, themeMode } = useTheme();

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={[styles.header, { borderBottomColor: theme.border }]}>
          <ThemedText style={styles.headerTitle}>Profile</ThemedText>
        </ThemedView>
        
        <View style={styles.emptyState}>
          <User size={64} color={theme.tint} />
          <ThemedText style={styles.emptyTitle}>
            Please login to view your profile
          </ThemedText>
          
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.tint }]}
            onPress={() => router.push("/login")}
          >
            {/* Make sure 'Text' is imported from 'react-native' at the top! */}
            <Text style={{ color: "#fff", fontWeight: "bold" }}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText style={styles.headerTitle}>Profile</ThemedText>
      </ThemedView>

      <ScrollView style={styles.content}>
        <ThemedView style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
            <User size={40} color="#fff" />
          </View>
          <View style={styles.userDetails}>
            {/* Added optional chaining ?. to prevent crashes if name/email are missing */}
            <ThemedText style={styles.userName}>{user?.name || "User"}</ThemedText>
            <ThemedText style={[styles.userEmail, { color: themeMode === 'dark' ? '#aaa' : '#666' }]}>
              {user?.email || ""}
            </ThemedText>
          </View>
        </ThemedView>

        <View style={styles.menuSection}>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.border }]} 
            onPress={toggleTheme}
          >
            <View style={styles.menuItemLeft}>
              {themeMode === 'light' ? <Moon size={24} color={theme.text} /> : <Sun size={24} color={theme.text} />}
              <ThemedText style={styles.menuItemLabel}>
                {themeMode === 'light' ? "Dark Mode" : "Light Mode"}
              </ThemedText>
            </View>
            <ChevronRight size={24} color={theme.text} />
          </TouchableOpacity>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { borderBottomColor: theme.border }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuItemLeft}>
                <item.icon size={24} color={theme.text} />
                <ThemedText style={styles.menuItemLabel}>{item.label}</ThemedText>
              </View>
              <ChevronRight size={24} color={theme.text} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { borderColor: theme.tint }]} 
          onPress={handleLogout}
        >
          <LogOut size={24} color={theme.tint} />
          <ThemedText style={[styles.logoutText, { color: theme.tint }]}>Logout</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 15, paddingTop: 50, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: "bold" },
  content: { flex: 1 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyTitle: { fontSize: 18, marginTop: 20, marginBottom: 20 },
  loginButton: { paddingHorizontal: 40, paddingVertical: 15, borderRadius: 10 },
  userInfo: { flexDirection: "row", alignItems: "center", padding: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  userDetails: { marginLeft: 15 },
  userName: { fontSize: 20, fontWeight: "bold", marginBottom: 5 },
  userEmail: { fontSize: 14 },
  menuSection: { marginTop: 10 },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 15, borderBottomWidth: 1 },
  menuItemLeft: { flexDirection: "row", alignItems: "center" },
  menuItemLabel: { fontSize: 16, marginLeft: 15 },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 15, marginTop: 20, marginHorizontal: 15, borderRadius: 10, borderWidth: 1, marginBottom: 30 },
  logoutText: { marginLeft: 10, fontSize: 16, fontWeight: "bold" },
});