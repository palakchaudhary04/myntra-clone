import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from "@/context/AuthContext";
import api from '../../constants/apiConfig';

export default function Payments() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user?._id) return;
      
      try {
        setIsLoading(true);
        // Ensure this route matches your backend (e.g., app.use("/transaction", ...))
        const response = await api.get(`/transaction/user/${user._id}`);
        setTransactions(response.data);
      } catch (error) {
        console.error("Fetch Transactions Error:", error);
        Alert.alert("Error", "Could not load payment history.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ff3f6c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Transaction History</Text>
      
      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>No payment history available.</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item: any) => item._id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.methodText}>{item.paymentMethod || "Payment"}</Text>
                <Text style={styles.amountText}>₹{item.amount}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                <Text style={[styles.statusText, { color: item.status === 'Success' ? '#00b852' : '#ff3f6c' }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#3e3e3e' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#666' },
  card: { 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0',
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8 
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  methodText: { fontSize: 16, fontWeight: '600' },
  amountText: { fontSize: 16, fontWeight: 'bold', color: '#ff3f6c' },
  dateText: { fontSize: 12, color: '#999' },
  statusText: { fontSize: 12, fontWeight: 'bold' }
});