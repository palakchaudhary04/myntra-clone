import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ShoppingBag, Trash2 } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import  api from "../../constants/apiConfig"; // Import the central instance

export default function Bag() {
  const router = useRouter();
  const { user } = useAuth();
  const [bag, setBag] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) fetchBag();
  }, [user]);

  const fetchBag = async () => {
    const userId = user?._id;
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/bag/${userId}`);
      setBag(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const moveItem = async (itemId: string, newStatus: string) => {
    try {
      await api.put(`/bag/move/${itemId}`, { status: newStatus });
      fetchBag();
    } catch (error) {
      Alert.alert("Error", "Could not update item");
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await api.delete(`/bag/${itemId}`);
      fetchBag();
    } catch (error) {
      console.error(error);
    }
  };

  const activeItems = bag.filter((i) => i.status === "cart");
  const savedItems = bag.filter((i) => i.status === "saved");
  const total = activeItems.reduce((sum, item) => sum + (Number(item.productId?.price) || 0) * item.quantity, 0);

  if (!user) return (
    <View style={styles.emptyState}>
      <ShoppingBag size={64} color="#ff3f6c" />
      <Text style={styles.emptyTitle}>Please login to view your bag</Text>
      <TouchableOpacity style={styles.loginButton} onPress={() => router.push("/login")}>
        <Text style={styles.loginButtonText}>LOGIN</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Shopping Bag</Text></View>
      {isLoading ? <ActivityIndicator size="large" color="#ff3f6c" style={{flex: 1}} /> : (
        <ScrollView style={styles.content}>
          {activeItems.map((item) => (
            <View key={item._id} style={styles.bagItem}>
              <Image source={{ uri: item.productId?.images[0] }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.productId?.name}</Text>
                <Text style={styles.itemPrice}>₹{item.productId?.price}</Text>
                <View style={styles.row}>
                  <TouchableOpacity onPress={() => moveItem(item._id, "saved")}>
                    <Text style={styles.linkText}>Save for Later</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item._id)}>
                    <Trash2 size={20} color="#ff3f6c" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>₹{total}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutButton} onPress={() => router.push({ pathname: "/checkout", params: { total: total.toString() }})}>
          <Text style={styles.checkoutButtonText}>PROCEED TO CHECKOUT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { padding: 15, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  headerTitle: { fontSize: 24, fontWeight: "bold" },
  content: { flex: 1, padding: 15 },
  bagItem: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 10, marginBottom: 15, elevation: 5, padding: 10 },
  itemImage: { width: 80, height: 100 },
  itemInfo: { flex: 1, paddingLeft: 15 },
  itemName: { fontSize: 16, fontWeight: "600" },
  itemPrice: { fontSize: 14, marginVertical: 5 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  linkText: { color: "#666", textDecorationLine: "underline", fontSize: 12 },
  footer: { padding: 15, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  totalContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  totalLabel: { fontSize: 16, color: "#333" },
  totalAmount: { fontSize: 18, fontWeight: "bold" },
  checkoutButton: { backgroundColor: "#ff3f6c", padding: 15, borderRadius: 10, alignItems: "center" },
  checkoutButtonText: { color: "#fff", fontWeight: "bold" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontSize: 18, marginVertical: 20 },
  loginButton: { backgroundColor: "#ff3f6c", padding: 15, borderRadius: 10 },
  loginButtonText: { color: "#fff", fontWeight: "bold" }
});