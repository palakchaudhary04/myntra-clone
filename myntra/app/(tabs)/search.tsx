/**
 * app/search.tsx
 *
 * FEATURE 1 – Multi-field search with debounce, autocomplete, filters, sort
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Image, SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Search, X, ArrowLeft } from 'lucide-react-native';
import api from "../../constants/apiConfig";

// ── Debounce hook ──────────────────────────────────────────────────────────
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const SORT_OPTIONS = [
  { label: 'Relevance',  value: 'relevance'  },
  { label: 'Price ↑',    value: 'price_asc'  },
  { label: 'Price ↓',    value: 'price_desc' },
  { label: 'Top Rated',  value: 'rating'     },
  { label: 'Newest',     value: 'newest'     },
  { label: 'Discount',   value: 'discount'   },
];

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category?: string; brand?: string }>();

  const [query,       setQuery]       = useState(params.q || '');
  const [suggestions, setSuggestions] = useState<{ label: string; type: string }[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [sort,        setSort]        = useState<string>('relevance');
  const [products,    setProducts]    = useState<any[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const debouncedQuery = useDebounce(query, 400);

  // Fetch suggestions
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      api.get(`/product/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`)
        .then(r => { setSuggestions(r.data); setShowSuggest(true); })
        .catch(() => {});
    } else {
      setSuggestions([]);
      setShowSuggest(false);
    }
  }, [debouncedQuery]);

  // Fetch search results
  const fetchResults = useCallback(async (
    searchQ: string, sortVal: string, pageNum: number, append = false
  ) => {
    try {
      append ? setLoadingMore(true) : setLoading(true);
      setError(null);

      const qs = new URLSearchParams();
      if (searchQ)         qs.set('q',        searchQ);
      if (params.category) qs.set('category', params.category);
      if (params.brand)    qs.set('brand',    params.brand);
      qs.set('sort',  sortVal);
      qs.set('page',  String(pageNum));
      qs.set('limit', '20');

      const res = await api.get(`/product/search?${qs.toString()}`);
      setProducts(prev => append ? [...prev, ...res.data.results] : res.data.results);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [params.category, params.brand]);

  // Re-fetch on query/sort change (reset page)
  useEffect(() => {
    setPage(1);
    fetchResults(debouncedQuery, sort, 1, false);
  }, [debouncedQuery, sort]);

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    const next = page + 1;
    setPage(next);
    fetchResults(debouncedQuery, sort, next, true);
  };

  const handleSuggestionPress = (label: string) => {
    setQuery(label);
    setShowSuggest(false);
    inputRef.current?.blur();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#3e3e3e" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Search size={16} color="#999" style={{ marginRight: 6 }} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search brands, products..."
            placeholderTextColor="#bbb"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoFocus={!params.q}
            autoCorrect={false}
            onSubmitEditing={() => setShowSuggest(false)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); }}>
              <X size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggestions */}
      {showSuggest && suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.suggestionRow}
              onPress={() => handleSuggestionPress(s.label)}
            >
              <Search size={12} color="#bbb" style={{ marginRight: 8 }} />
              <Text style={styles.suggestionLabel}>{s.label}</Text>
              <Text style={styles.suggestionType}>{s.type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sort chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortRow}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
      >
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, sort === opt.value && styles.chipActive]}
            onPress={() => setSort(opt.value)}
          >
            <Text style={[styles.chipText, sort === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Result count */}
      {!loading && (
        <Text style={styles.resultCount}>
          {total > 0 ? `${total} products found` : ''}
        </Text>
      )}

      {/* Error */}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Results */}
      {loading ? (
        <ActivityIndicator size="large" color="#ff3f6c" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore
            ? <ActivityIndicator color="#ff3f6c" style={{ marginVertical: 16 }} />
            : null}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No products found.</Text>
              <Text style={styles.emptySubText}>Try a different search term or remove filters.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => router.push(`/product/${item._id}`)}
            >
              <Image
                source={{ uri: item.images?.[0] || '' }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.brandName} numberOfLines={1}>{item.brand}</Text>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>₹{item.price}</Text>
                  {item.discount > 0 && (
                    <Text style={styles.discountText}>{item.discount}% OFF</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#fff' },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn:        { padding: 6, marginRight: 6 },
  searchBar:      { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  searchInput:    { flex: 1, fontSize: 14, color: '#333', padding: 0 },
  suggestions:    { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', zIndex: 10 },
  suggestionRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#fafafa' },
  suggestionLabel:{ flex: 1, fontSize: 14, color: '#333' },
  suggestionType: { fontSize: 11, color: '#bbb', marginLeft: 8 },
  sortRow:        { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  chip:           { borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 },
  chipActive:     { borderColor: '#ff3f6c', backgroundColor: '#ff3f6c' },
  chipText:       { fontSize: 12, color: '#666' },
  chipTextActive: { color: '#fff' },
  resultCount:    { paddingHorizontal: 14, paddingVertical: 6, fontSize: 12, color: '#888' },
  grid:           { paddingHorizontal: 10, paddingBottom: 20 },
  productCard:    { width: '48%', marginBottom: 14, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#f0f0f0', overflow: 'hidden' },
  productImage:   { width: '100%', height: 180 },
  productInfo:    { padding: 8 },
  brandName:      { fontSize: 12, fontWeight: '700', color: '#282c3f' },
  productName:    { fontSize: 11, color: '#535766', marginVertical: 2 },
  priceRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price:          { fontSize: 13, fontWeight: '700', color: '#282c3f' },
  discountText:   { fontSize: 11, color: '#ff905a', fontWeight: '700' },
  error:          { color: '#e24b4a', textAlign: 'center', margin: 20 },
  emptyBox:       { alignItems: 'center', marginTop: 60 },
  emptyText:      { fontSize: 16, color: '#555', fontWeight: '600' },
  emptySubText:   { fontSize: 13, color: '#999', marginTop: 8 },
});