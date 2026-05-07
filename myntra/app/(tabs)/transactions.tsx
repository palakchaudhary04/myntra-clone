import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api from '../../constants/apiConfig';
import { useAuth } from "@/context/AuthContext";

export default function Transactions() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchTransactions("All");
  }, [user]);

  const fetchTransactions = async (type: string) => {
    if (!user) return;
    setLoading(true);
    try {
      // Ensure this endpoint matches your backend route
      const res = await api.get(`/transaction/user/${user._id}?type=${type}`);
      setData(res.data);
    } catch (err) {
      console.error("Fetch Transactions Error:", err);
      Alert.alert("Notice", "No transactions found yet.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#ff3f6c" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Transactions</Text>
      
      {data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text>No transactions available. Place an order to see it here!</Text>
        </View>
      ) : (
        <FlatList 
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View>
                <Text style={styles.type}>{item.type}</Text>
                <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.amount}>₹{item.amount}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff', paddingTop: 50 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  card: { padding: 15, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontWeight: 'bold', fontSize: 16 },
  date: { color: '#666', fontSize: 12 },
  amount: { fontWeight: 'bold', fontSize: 16, color: '#ff3f6c' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});