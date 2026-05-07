import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../constants/apiConfig'; // Import the central instance
import { useRouter } from 'expo-router';

interface Product {
  _id: string;
  images: string[];
  name: string;
  price: number;
}

interface Props {
  category: string;
  currentProductId: string;
}

export default function RecommendationCarousel({ category, currentProductId }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!category) {
      setLoading(false);
      return;
    }

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      try {
        // Log the URL to your console so you can copy-paste it into a browser to test
        const url = `http://172.28.192.1:5000/product/category/${category}`;
        console.log("Fetching recs from:", url);
        
        const res = await api.get(url);
        
        // Filter out current product
        const filtered = res.data.filter((p: Product) => p._id !== currentProductId);
        setProducts(filtered);
      } catch (err: any) {
        console.error("API Error in Carousel:", err.message);
        setError("Could not load recommendations.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [category, currentProductId]);

  if (loading) return <ActivityIndicator style={styles.loader} size="small" color="#ff3f6c" />;
  if (error) return <Text style={styles.errorText}>{error}</Text>;
  if (products.length === 0) return null; // Clean exit if no items

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You May Also Like</Text>
      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => router.push(`/product/${item._id}` as any)}
          >
            <Image 
              source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }} 
              style={styles.image} 
            />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.price}>₹{item.price}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20, marginBottom: 30, paddingLeft: 16 },
  loader: { marginVertical: 20 },
  errorText: { color: 'red', textAlign: 'center', margin: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  card: { width: 140, marginRight: 12, backgroundColor: '#fff', borderRadius: 8, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  image: { width: '100%', height: 160, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  info: { padding: 8 },
  name: { fontSize: 13, color: '#333' },
  price: { fontSize: 14, fontWeight: 'bold', marginTop: 4, color: '#ff3f6c' },
});