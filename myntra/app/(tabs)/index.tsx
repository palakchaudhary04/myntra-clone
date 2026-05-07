import {
  ScrollView, View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, ChevronRight } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "../../constants/apiConfig"; // Import the central instance

const deals = [
  { id: 1, title: "Under ₹599", image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&auto=format&fit=crop" },
  { id: 2, title: "40-70% Off", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop" },
];

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [product, setproduct] = useState<any>(null);
  const [categories, setcategories] = useState<any>(null);
  const { user } = useAuth();

  const handleProductPress = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleCategoryPress = (categoryId: string) => {
    router.push({
      pathname: "/categories",
      params: { autoSelect: categoryId }
    });
  };

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setIsLoading(true);
        // Using the central 'api' instance
        const [catRes, prodRes] = await Promise.all([
          api.get("/category"), 
          api.get("/product")
        ]);
        setcategories(catRes.data);
        setproduct(prodRes.data);
      } catch (error) {
        console.log("Fetch Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ... keep your Header, Banner, and Sections as they were ... */}
      {/* Ensure all images and touchables remain same */}
      <View style={styles.header}>
        <Text style={styles.logo}>MYNTRA</Text>
        <TouchableOpacity style={styles.searchButton}><Search size={24} color="#3e3e3e" /></TouchableOpacity>
      </View>

      <Image source={{ uri: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&auto=format&fit=crop" }} style={styles.banner} resizeMode="cover" />

      {/* SHOP BY CATEGORY */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SHOP BY CATEGORY</Text>
          <TouchableOpacity style={styles.viewAll} onPress={() => router.push("/categories")}>
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={20} color="#ff3f6c" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {isLoading ? <ActivityIndicator size="small" color="#ff3f6c" /> : categories?.map((category: any) => (
            <TouchableOpacity key={category._id} style={styles.categoryCard} onPress={() => handleCategoryPress(category._id)}>
              <Image source={{ uri: category.image }} style={styles.categoryImage} />
              <Text style={styles.categoryName} numberOfLines={1}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* TRENDING NOW */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>TRENDING NOW</Text></View>
        {isLoading ? <ActivityIndicator size="large" color="#ff3f6c" style={styles.loader} /> : ( 
          <View style={styles.productsGrid}>
            {product?.map((item: any) => (
              <TouchableOpacity key={item._id} style={styles.productCard} onPress={() => handleProductPress(item._id)}>
                <Image source={{ uri: item.images ? item.images[0] : '' }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.brandName}>{item.brand}</Text>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.productPrice}>₹{item.price}</Text>
                    <Text style={styles.discount}>{item.discount}% OFF</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ... styles remain unchanged

const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: "#fff" },

  header: {

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    padding: 15,

    paddingTop: 50,

    backgroundColor: "#fff",

    borderBottomWidth: 1,

    borderBottomColor: "#f0f0f0",

  },

  logo: { fontSize: 24, fontWeight: "bold", color: "#3e3e3e", letterSpacing: 1 },

  searchButton: { padding: 8 },

  banner: { width: "100%", height: 220 },

  section: { padding: 15 },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },

  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#282c3f", letterSpacing: 0.5 },

  viewAll: { flexDirection: "row", alignItems: "center" },

  viewAllText: { color: "#ff3f6c", fontWeight: 'bold', fontSize: 14, marginRight: 2 },

  categoriesScroll: { marginHorizontal: -5 },

  categoryCard: { width: 85, marginHorizontal: 10, alignItems: 'center' },

  categoryImage: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: '#f9f9f9' },

  categoryName: { textAlign: "center", marginTop: 8, fontSize: 12, fontWeight: '500', color: "#3e3e3e" },

  dealsScroll: { marginHorizontal: -15 },

  dealCard: { width: 300, height: 160, marginHorizontal: 10, borderRadius: 8, overflow: "hidden" },

  dealImage: { width: "100%", height: "100%" },

  dealOverlay: {

    position: "absolute",

    bottom: 0,

    left: 0,

    right: 0,

    backgroundColor: "rgba(0,0,0,0.3)",

    padding: 12,

  },

  dealTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  productsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: 'space-between' },

  productCard: {

    width: "48%",

    marginBottom: 15,

    backgroundColor: "#fff",

    borderRadius: 8,

    borderWidth: 1,

    borderColor: '#f0f0f0'

  },

  productImage: { width: "100%", height: 220, borderTopLeftRadius: 8, borderTopRightRadius: 8 },

  productInfo: { padding: 8 },

  brandName: { fontSize: 14, fontWeight: 'bold', color: "#282c3f", marginBottom: 2 },

  productName: { fontSize: 13, color: '#535766', marginBottom: 5 },

  priceRow: { flexDirection: "row", alignItems: "center" },

  productPrice: { fontSize: 14, fontWeight: "bold", color: "#282c3f", marginRight: 5 },

  discount: { fontSize: 12, color: "#ff905a", fontWeight: "bold" },

  loader: { marginVertical: 40 },

});