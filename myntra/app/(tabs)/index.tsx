import React, { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import api from '../../constants/apiConfig';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading,   setIsLoading]   = useState(false);
  const [products,    setProducts]    = useState<any[]>([]);
  const [categories,  setCategories]  = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const [catRes, prodRes] = await Promise.all([
          api.get('/category'),
          api.get('/product'),
        ]);
        setCategories(catRes.data);
        setProducts(prodRes.data);
      } catch (err) {
        console.error('Home fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (q.length < 1) return;
    // Use 'as any' to bypass Expo Router strict href typing for dynamic params
    router.push({ pathname: '/search' as any, params: { q } });
  };

  const handleCategoryPress = (categoryName: string) => {
    router.push({ pathname: '/search' as any, params: { category: categoryName } });
  };

  const handleProductPress = (productId: string) => {
    router.push(('/product/' + productId) as any);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>myntra</Text>
      </View>

      {/* Search bar – tapping opens SearchScreen */}
      <TouchableOpacity
        style={styles.searchBar}
        activeOpacity={0.8}
        onPress={() => router.push('/search' as any)}
      >
        <Search size={18} color="#999" style={{ marginRight: 8 }} />
        <Text style={styles.searchPlaceholder}>
          Search brands, products, categories...
        </Text>
      </TouchableOpacity>

      {/* Banner */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&auto=format&fit=crop' }}
        style={styles.banner}
        resizeMode="cover"
      />

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SHOP BY CATEGORY</Text>
          <TouchableOpacity
            style={styles.viewAll}
            onPress={() => router.push('/categories' as any)}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={18} color="#ff3f6c" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {isLoading
            ? <ActivityIndicator size="small" color="#ff3f6c" />
            : categories.map((cat: any) => (
              <TouchableOpacity
                key={cat._id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(cat.name)}
              >
                <Image source={{ uri: cat.image }} style={styles.categoryImage} />
                <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
              </TouchableOpacity>
            ))
          }
        </ScrollView>
      </View>

      {/* Products grid */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TRENDING NOW</Text>
        </View>

        {isLoading
          ? <ActivityIndicator size="large" color="#ff3f6c" style={{ marginVertical: 40 }} />
          : (
            <View style={styles.productsGrid}>
              {products.map((item: any) => (
                <TouchableOpacity
                  key={item._id}
                  style={styles.productCard}
                  onPress={() => handleProductPress(item._id)}
                >
                  <Image
                    source={{ uri: item.images?.[0] ?? '' }}
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.brandName} numberOfLines={1}>{item.brand}</Text>
                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.productPrice}>₹{item.price}</Text>
                      {Number(item.discount) > 0 && (
                        <Text style={styles.discount}>{item.discount}% OFF</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
        }
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#fff' },
  header:          { padding: 15, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  logo:            { fontSize: 26, fontWeight: 'bold', color: '#ff3f6c', letterSpacing: 2 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchPlaceholder: { fontSize: 14, color: '#aaa', flex: 1 },

  banner:          { width: '100%', height: 200 },
  section:         { padding: 15 },
  sectionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle:    { fontSize: 14, fontWeight: 'bold', color: '#282c3f', letterSpacing: 0.5 },
  viewAll:         { flexDirection: 'row', alignItems: 'center' },
  viewAllText:     { color: '#ff3f6c', fontWeight: 'bold', fontSize: 13, marginRight: 2 },

  categoryCard:    { width: 80, marginHorizontal: 8, alignItems: 'center' },
  categoryImage:   { width: 70, height: 70, borderRadius: 35, backgroundColor: '#f9f9f9' },
  categoryName:    { textAlign: 'center', marginTop: 6, fontSize: 11, fontWeight: '500', color: '#3e3e3e' },

  productsGrid:    { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard:     { width: '48%', marginBottom: 15, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#f0f0f0' },
  productImage:    { width: '100%', height: 200, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  productInfo:     { padding: 8 },
  brandName:       { fontSize: 13, fontWeight: 'bold', color: '#282c3f', marginBottom: 2 },
  productName:     { fontSize: 12, color: '#535766', marginBottom: 4 },
  priceRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  productPrice:    { fontSize: 13, fontWeight: 'bold', color: '#282c3f' },
  discount:        { fontSize: 11, color: '#ff905a', fontWeight: 'bold' },
});