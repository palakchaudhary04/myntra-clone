import { useAuth } from "@/context/AuthContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MapPin, CreditCard, Truck } from "lucide-react-native";
import React, { useState } from "react";
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  TouchableOpacity, Alert, ActivityIndicator 
} from "react-native";
import api from '../constants/apiConfig';

export default function Checkout() {
  const { total } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();

  const [address, setAddress] = useState("123 Main Street, Apt 4B");
  // Added state for dynamic payment selection
  const [paymentMethod, setPaymentMethod] = useState("UPI"); 
  const [loading, setLoading] = useState(false);

  const paymentOptions = ["UPI", "Credit Card", "Net Banking", "Cash on Delivery"];

  const handlePlaceOrder = async () => {
    if (!user?._id) {
      Alert.alert("Error", "User not logged in");
      return;
    }

    setLoading(true);

    try {
      // Payload now includes the dynamic paymentMethod state
      const orderPayload = {
        shippingAddress: address,
        paymentMethod: paymentMethod, 
      };

      const response = await api.post(`/order/create/${user._id}`, orderPayload);
      console.log("Order created successfully:", response.data);

      Alert.alert("Success", "Order placed successfully!");
      router.replace("/orders");
    } catch (error: any) {
      if (error.response) {
        console.error("Backend validation error:", error.response.data);
        Alert.alert("Error", error.response.data?.message || "Unable to place order");
      } else {
        console.error("Order Failed:", error.message || error);
        Alert.alert("Error", "Unable to place order");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Shipping Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color="#ff3f6c" />
            <Text style={styles.sectionTitle}>Shipping Address</Text>
          </View>
          <TextInput 
            style={styles.input} 
            value={address} 
            onChangeText={setAddress} 
            placeholder="Enter your address"
          />
        </View>

        {/* Payment Selection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color="#ff3f6c" />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          {paymentOptions.map((option) => (
            <TouchableOpacity 
              key={option} 
              style={[styles.option, paymentMethod === option && styles.selectedOption]}
              onPress={() => setPaymentMethod(option)}
            >
              <Text style={paymentMethod === option ? styles.selectedOptionText : styles.optionText}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Truck size={20} color="#ff3f6c" />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Total Payable</Text>
            <Text style={styles.totalValue}>₹{total}</Text>
          </View>
        </View>
      </ScrollView>
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.disabledButton]} 
        onPress={handlePlaceOrder}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>PLACE ORDER</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { padding: 15, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  headerTitle: { fontSize: 24, fontWeight: "bold" },
  content: { flex: 1, padding: 15 },
  section: { marginBottom: 20, padding: 15, backgroundColor: "#f9f9f9", borderRadius: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginLeft: 10 },
  input: { backgroundColor: "#fff", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#ddd" },
  option: { padding: 12, backgroundColor: "#fff", marginVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#ddd" },
  selectedOption: { backgroundColor: "#ff3f6c", borderColor: "#ff3f6c" },
  optionText: { color: "#3e3e3e" },
  selectedOptionText: { color: "#fff", fontWeight: "bold" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  totalValue: { fontSize: 18, fontWeight: "bold", color: "#ff3f6c" },
  button: { backgroundColor: "#ff3f6c", padding: 15, margin: 15, borderRadius: 10, alignItems: "center" },
  disabledButton: { backgroundColor: "#ff99b0" },
  buttonText: { color: "#fff", fontWeight: "bold" }
});