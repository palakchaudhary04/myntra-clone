import React, { useState, useEffect } from "react";
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, useWindowDimensions, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ShoppingBag } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import api from "../../constants/apiConfig"; // Import the central instance

// --- Intelligent Recommendation Component ---
const RecommendationCarousel = ({ userId, category, currentProductId }: { userId: string | null, category: string, currentProductId: string }) => {
  const [products, setProducts] = useState<any[]>([]);
  const router = useRouter();

// Inside RecommendationCarousel component:
useEffect(() => {
  if (!category) return; // Add this guard clause!
  
  const fetchRecs = async () => {
    try {
      const url = userId 
        ? `http://172.28.192.1:5000/recommend/personalized/${userId}?category=${category}`
        : `http://172.28.192.1:5000/product/category/${category}`;
      
      const res = await api.get(url);
      setProducts(res.data.filter((p: any) => p._id !== currentProductId));
    } catch (err) { console.error("Rec Error:", err); }
  };
  fetchRecs();
}, [category, userId]);

  if (products.length === 0) return null;

  return (
    <View style={styles.carouselSection}>
      <Text style={styles.sectionTitle}>You May Also Like</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {products.map((item) => (
          <TouchableOpacity key={item._id} style={styles.recCard} onPress={() => router.push(`/product/${item._id}` as any)}>
            <Image source={{ uri: item.images[0] }} style={styles.recImage} />
            <Text numberOfLines={1} style={styles.recName}>{item.name}</Text>
            <Text style={styles.recPrice}>₹{item.price}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// --- Main Page ---
export default function ProductDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  
  const [product, setProduct] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initPage = async () => {
      try {
        // 1. Fetch Product
        const res = await api.get(`/product/${id}`);
        setProduct(res.data);
        
        // 2. Track Browsing History Server-Side
        /*if (user) {
          await api.post(`/history/add`, { 
            userId: user._id, 
            productId: id 
          });
        }*/
      } catch (error) { console.error("Fetch Product Error:", error); } 
      finally { setIsLoading(false); }
    };
    initPage();
  }, [id, user]);

  const handleAddToBag = async () => {
    if (!user) { router.push("/login"); return; }
    if (!selectedSize) { Alert.alert("Selection Required", "Please select a size"); return; }
    setLoading(true);
    try {
      await api.post(`/bag`, { userId: user._id, productId: id, size: selectedSize, quantity: 1 });
      router.push("/bag");
    } catch (error) { console.error("Add to Bag Error:", error); }
    finally { setLoading(false); }
  };

  if (isLoading || !product) return <View style={styles.loader}><ActivityIndicator size="large" color="#ff3f6c" /></View>;
console.log("Product Category being passed:", product?.category);
  return (
    <View style={styles.container}>
      <ScrollView>
        <Image source={{ uri: product.images[0] }} style={[styles.productImage, { width }]} />
        <View style={styles.content}>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>₹{product.price}</Text>
          <Text style={styles.description}>{product.description}</Text>

          <Text style={styles.sizeTitle}>Select Size</Text>
          <View style={styles.sizeGrid}>
            {product.sizes.map((size: string) => (
              <TouchableOpacity key={size} style={[styles.sizeButton, selectedSize === size && styles.selected]} onPress={() => setSelectedSize(size)}>
                <Text style={selectedSize === size ? {color: '#fff'} : {}}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dynamic Recommendations */}
          <RecommendationCarousel userId={user?._id || null} category={product.category} currentProductId={product._id} />
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.footerButton} onPress={handleAddToBag}>
        <Text style={styles.footerText}>{loading ? "ADDING..." : "ADD TO BAG"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loader: { flex: 1, justifyContent: "center" },
  productImage: { height: 400 },
  content: { padding: 20 },
  brand: { fontSize: 16, color: "#666" },
  name: { fontSize: 22, fontWeight: "bold", marginVertical: 10 },
  price: { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  description: { color: "#666", marginBottom: 20 },
  sizeTitle: { fontSize: 16, fontWeight: "bold" },
  sizeGrid: { flexDirection: "row", marginTop: 10, gap: 10 },
  sizeButton: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  selected: { backgroundColor: "#ff3f6c", borderColor: "#ff3f6c" },
  carouselSection: { marginTop: 30 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  recCard: { width: 140, marginRight: 15 },
  recImage: { width: 140, height: 180, borderRadius: 8 },
  recName: { fontSize: 14, marginTop: 5 },
  recPrice: { fontWeight: "bold" },
  footerButton: { backgroundColor: "#ff3f6c", padding: 20, alignItems: "center" },
  footerText: { color: "#fff", fontWeight: "bold" }
});