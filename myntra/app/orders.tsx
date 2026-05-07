import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Package, ChevronRight, MapPin, Truck, CreditCard } from "lucide-react-native";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import api from "../constants/apiConfig"; // Ensure this matches your project structure

export default function Orders() {
  const router = useRouter();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]); // Initialize as empty array

  useEffect(() => {
    const fetchOrders = async () => {
      if (user) {
        try {
          setIsLoading(true);
          const response = await api.get(`/order/user/${user._id}`);
          console.log("Orders received:", response.data); 
          setOrders(response.data);
        } catch (error) {
          console.error("Fetch Orders Error:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchOrders();
  }, [user]);

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ff3f6c" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50, fontSize: 16 }}>No orders placed yet.</Text>
      </View>
    );
  }

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      <ScrollView style={styles.content}>
        {orders.map((order: any) => (
          <View key={order._id} style={styles.orderCard}>
            <TouchableOpacity style={styles.orderHeader} onPress={() => toggleOrderDetails(order._id)}>
              <View>
                <Text style={styles.orderId}>Order #{order._id.slice(-6)}</Text>
                <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.statusContainer}>
                <Package size={16} color="#00b852" />
                <Text style={styles.orderStatus}>{order.status || "Placed"}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.itemsContainer}>
              {order.items?.map((item: any, index: number) => (
                <View key={index} style={styles.orderItem}>
                  <Image
                    // Defensive check: handle if images is an array or string
                    source={{ uri: Array.isArray(item.productId?.images) ? item.productId.images[0] : item.productId?.images }}
                    style={styles.itemImage}
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.brandName}>{item.productId?.brand || "Unknown Brand"}</Text>
                    <Text style={styles.itemName}>{item.productId?.name || "Product"}</Text>
                    <Text style={styles.itemPrice}>₹{item.productId?.price || 0}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* EXPANDED SECTION */}
            {expandedOrder === order._id && (
              <View style={styles.orderDetails}>
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}><MapPin size={20} color="#3e3e3e" /><Text style={styles.detailTitle}>Shipping Address</Text></View>
                  <Text style={styles.detailText}>{order.shippingAddress || "Not provided"}</Text>
                </View>

                {/* Tracking & Timeline (Optional: render only if backend sends tracking data) */}
                {order.tracking && (
                   <View style={styles.detailSection}>
                     <View style={styles.detailHeader}><Truck size={20} color="#3e3e3e" /><Text style={styles.detailTitle}>Tracking</Text></View>
                     <Text style={styles.detailText}>{order.tracking.number}</Text>
                   </View>
                )}
              </View>
            )}
            
            <View style={styles.orderFooter}>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Order Total</Text>
                <Text style={styles.totalAmount}>₹{order.total}</Text>
              </View>
              <TouchableOpacity style={styles.detailsButton} onPress={() => toggleOrderDetails(order._id)}>
                <Text style={styles.detailsButtonText}>{expandedOrder === order._id ? "Hide Details" : "View Details"}</Text>
                <ChevronRight size={20} color="#ff3f6c" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  content: {
    paddingHorizontal: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  orderDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderStatus: {
    fontSize: 13,
    color: '#00b852',
    fontWeight: '600',
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#ececec',
    paddingTop: 16,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  itemImage: {
    width: 75,
    height: 75,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  orderDetails: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ececec',
  },
  detailSection: {
    marginBottom: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: '#888',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginTop: 2,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsButtonText: {
    color: '#ff3f6c',
    fontSize: 14,
    fontWeight: '700',
  },
});

// ... Keep your existing styles unchanged ...