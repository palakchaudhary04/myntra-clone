/**
 * app/checkout.tsx
 *
 * FEATURE 2 – Atomic order creation (backend handles stock decrement)
 * FEATURE 3 – Razorpay WebView payment + HMAC-SHA256 verify
 * FEATURE 4 – Duplicate order prevention via idempotency, state checks
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, CreditCard, Truck, ArrowLeft, Lock } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '@/context/AuthContext';
import api from '../constants/apiConfig';

type Step = 'address' | 'review' | 'payment' | 'done';

const PAYMENT_OPTIONS = ['UPI', 'Credit Card', 'Net Banking', 'Cash on Delivery'];

export default function Checkout() {
  const { total }   = useLocalSearchParams<{ total?: string }>();
  const { user }    = useAuth();
  const router      = useRouter();
  const webViewRef  = useRef<any>(null);

  const [step,          setStep]          = useState<Step>('address');
  const [address,       setAddress]       = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [loading,       setLoading]       = useState(false);
  const [razorpayHtml,  setRazorpayHtml]  = useState<string | null>(null);
  const [pendingOrder,  setPendingOrder]  = useState<{
    orderId: string;
    razorpayOrderId: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  // ── Address validation ─────────────────────────────────────────────────
  const validateAddress = () => {
    if (!address.trim() || address.trim().length < 10) {
      Alert.alert('Invalid Address', 'Please enter a complete shipping address (min 10 characters)');
      return false;
    }
    return true;
  };

  // ── Step 1 → 2 ────────────────────────────────────────────────────────
  const handleContinue = () => {
    if (!validateAddress()) return;
    setStep('review');
  };

  // ── Step 2 → 3: Initiate order on backend, open Razorpay ─────────────
  const handleProceedToPayment = useCallback(async () => {
    if (!user?._id) { Alert.alert('Error', 'Please login to continue'); return; }

    setLoading(true);
    try {
      // COD: skip Razorpay, use legacy /order/create directly
      if (paymentMethod === 'Cash on Delivery') {
        const res = await api.post(`/order/create/${user._id}`, {
          shippingAddress: address,
          paymentMethod,
        });
        console.log('COD order:', res.data);
        setStep('done');
        return;
      }

      // Online payment: call /order/initiate (Feature 2 – atomic stock decrement)
      const res = await api.post(`/order/initiate/${user._id}`, {
        shippingAddress: address,
        paymentMethod,
      });
      const data = res.data;

      // Feature 4: if duplicate order returned, check if already paid
      if (data.status === 'paid') {
        Alert.alert('Already Paid', 'This order has already been paid.');
        setStep('done');
        return;
      }

      setPendingOrder({
        orderId:         data.orderId,
        razorpayOrderId: data.razorpayOrderId,
      });

      // Build Razorpay WebView HTML
      setRazorpayHtml(buildRazorpayHtml(data, address, user));
      setStep('payment');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Could not initiate order';
      Alert.alert('Order Error', msg);
    } finally {
      setLoading(false);
    }
  }, [user, address, paymentMethod]);

  // ── WebView message handler (Feature 3 – HMAC verify) ─────────────────
  const handleWebViewMessage = useCallback(async (event: any) => {
    let data: any;
    try { data = JSON.parse(event.nativeEvent.data); } catch { return; }

    if (data.event === 'payment.cancel') {
      setRazorpayHtml(null);
      setStep('review');
      Alert.alert('Cancelled', 'Payment was cancelled. You can retry.');
      return;
    }

    if (data.event === 'payment.error') {
      setRazorpayHtml(null);
      setStep('review');
      Alert.alert('Payment Failed', data.description || 'Please try again.');
      return;
    }

    if (data.event === 'payment.success' && pendingOrder) {
      setVerifying(true);
      try {
        // POST to /order/verify – backend checks HMAC-SHA256 (Feature 3)
        // and does atomic pending→paid transition (Feature 4)
        const verifyRes = await api.post('/order/verify', {
          orderId:           pendingOrder.orderId,
          razorpayOrderId:   data.razorpay_order_id,
          razorpayPaymentId: data.razorpay_payment_id,
          razorpaySignature: data.razorpay_signature,
          userId:            user?._id,
        });

        if (verifyRes.data.success || verifyRes.data.message === 'Order already paid') {
          setStep('done');
        } else {
          Alert.alert('Verification Failed', 'Payment could not be verified. Contact support.');
          setStep('review');
        }
      } catch (e: any) {
        // "already paid" is treated as success (idempotent)
        if (e?.response?.data?.message?.includes('already paid')) {
          setStep('done');
        } else {
          Alert.alert('Error', e?.response?.data?.message || 'Verification error');
          setStep('review');
        }
      } finally {
        setVerifying(false);
        setRazorpayHtml(null);
      }
    }
  }, [pendingOrder, user]);

  // ── Success screen ─────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Text style={styles.successTick}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.successSub}>
            Your order has been confirmed and is being processed.
          </Text>
          <TouchableOpacity style={styles.continueBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.continueBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Payment WebView ────────────────────────────────────────────────────
  if (step === 'payment' && razorpayHtml) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.webHeader}>
          <TouchableOpacity onPress={() => { setRazorpayHtml(null); setStep('review'); }}>
            <Text style={styles.webCancelBtn}>✕  Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.webTitle}>Secure Payment</Text>
          <View style={styles.lockRow}>
            <Lock size={12} color="#666" />
            <Text style={styles.lockText}>Razorpay</Text>
          </View>
        </View>
        {verifying && (
          <View style={styles.verifyingOverlay}>
            <ActivityIndicator size="large" color="#ff3f6c" />
            <Text style={styles.verifyingText}>Verifying payment...</Text>
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ html: razorpayHtml }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webLoader}>
              <ActivityIndicator size="large" color="#ff3f6c" />
              <Text style={styles.webLoaderText}>Loading payment...</Text>
            </View>
          )}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    );
  }

  // ── Address + Review steps ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => step === 'review' ? setStep('address') : router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color="#3e3e3e" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Checkout</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {['Address', 'Review', 'Payment'].map((label, i) => {
            const stepIdx = step === 'address' ? 0 : step === 'review' ? 1 : 2;
            const done   = i < stepIdx;
            const active = i === stepIdx;
            return (
              <React.Fragment key={label}>
                <View style={styles.stepItem}>
                  <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
                    <Text style={[styles.stepDotText, (done || active) && styles.stepDotTextActive]}>
                      {done ? '✓' : String(i + 1)}
                    </Text>
                  </View>
                  <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
                </View>
                {i < 2 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
              </React.Fragment>
            );
          })}
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">

          {/* ── ADDRESS STEP ── */}
          {step === 'address' && (
            <View>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MapPin size={20} color="#ff3f6c" />
                  <Text style={styles.sectionTitle}>Shipping Address</Text>
                </View>
                <TextInput
                  style={styles.addressInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter your full address including city, state and pincode"
                  placeholderTextColor="#bbb"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue}>
                <Text style={styles.primaryBtnText}>Continue to Review →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── REVIEW STEP ── */}
          {step === 'review' && (
            <View>
              {/* Address card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.sectionHeader}>
                    <MapPin size={18} color="#ff3f6c" />
                    <Text style={styles.sectionTitle}>Delivering to</Text>
                  </View>
                  <TouchableOpacity onPress={() => setStep('address')}>
                    <Text style={styles.editLink}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.addressText}>{address}</Text>
              </View>

              {/* Payment selection */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <CreditCard size={20} color="#ff3f6c" />
                  <Text style={styles.sectionTitle}>Payment Method</Text>
                </View>
                {PAYMENT_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.paymentOption, paymentMethod === option && styles.paymentOptionSelected]}
                    onPress={() => setPaymentMethod(option)}
                  >
                    <View style={[styles.radioCircle, paymentMethod === option && styles.radioCircleSelected]}>
                      {paymentMethod === option && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.paymentOptionText, paymentMethod === option && styles.paymentOptionTextSelected]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Order summary */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Truck size={18} color="#ff3f6c" />
                  <Text style={styles.sectionTitle}>Order Summary</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Items total</Text>
                  <Text style={styles.summaryValue}>₹{total}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery</Text>
                  <Text style={[styles.summaryValue, { color: '#26a541' }]}>FREE</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Payable</Text>
                  <Text style={styles.totalValue}>₹{total}</Text>
                </View>
              </View>

              <View style={styles.secureRow}>
                <Lock size={12} color="#888" />
                <Text style={styles.secureText}>100% secure payments via Razorpay</Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleProceedToPayment}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Pay ₹{total} →</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Razorpay WebView HTML builder ──────────────────────────────────────────
function buildRazorpayHtml(orderData: any, address: string, user: any) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{display:flex;align-items:center;justify-content:center;height:100vh;background:#f5f5f5;font-family:sans-serif}
    .loader{text-align:center;color:#555}
    .spinner{width:36px;height:36px;border:3px solid #eee;border-top-color:#ff3f6c;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto}
    @keyframes spin{to{transform:rotate(360deg)}}
    p{margin-top:12px;font-size:14px}
  </style>
</head>
<body>
  <div class="loader"><div class="spinner"></div><p>Opening payment...</p></div>
  <script>
    var rzp = new Razorpay({
      key:         "${orderData.keyId}",
      amount:      "${orderData.amount}",
      currency:    "${orderData.currency}",
      order_id:    "${orderData.razorpayOrderId}",
      name:        "Myntra Clone",
      description: "Fashion Order",
      prefill: {
        name:    "${(user?.name || '').replace(/"/g, '')}",
        email:   "${(user?.email || '').replace(/"/g, '')}",
        contact: ""
      },
      theme: { color: "#ff3f6c" },
      modal: {
        ondismiss: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ event:"payment.cancel" }));
        }
      },
      handler: function(resp) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          event:                "payment.success",
          razorpay_order_id:   resp.razorpay_order_id,
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_signature:  resp.razorpay_signature
        }));
      }
    });
    rzp.on("payment.failed", function(r) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        event: "payment.error", description: r.error.description
      }));
    });
    window.onload = function() { rzp.open(); };
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#fff' },
  topBar:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn:             { padding: 4 },
  topBarTitle:         { fontSize: 16, fontWeight: '700', color: '#282c3f' },
  stepRow:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  stepItem:            { alignItems: 'center' },
  stepDot:             { width: 24, height: 24, borderRadius: 12, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  stepDotActive:       { backgroundColor: '#ff3f6c' },
  stepDotDone:         { backgroundColor: '#26a541' },
  stepDotText:         { fontSize: 11, color: '#999', fontWeight: '600' },
  stepDotTextActive:   { color: '#fff' },
  stepLabel:           { fontSize: 10, color: '#999', marginTop: 3 },
  stepLabelActive:     { color: '#ff3f6c', fontWeight: '600' },
  stepLine:            { flex: 1, height: 2, backgroundColor: '#eee', marginBottom: 14, marginHorizontal: 4 },
  stepLineDone:        { backgroundColor: '#26a541' },
  content:             { flex: 1, padding: 14, backgroundColor: '#f6f6f6' },
  section:             { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12 },
  sectionHeader:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle:        { fontSize: 15, fontWeight: '700', color: '#282c3f', marginLeft: 8 },
  addressInput:        { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, color: '#333', minHeight: 80 },
  card:                { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12 },
  cardHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  editLink:            { color: '#ff3f6c', fontSize: 13, fontWeight: '600' },
  addressText:         { fontSize: 13, color: '#555', lineHeight: 20 },
  paymentOption:       { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginVertical: 4 },
  paymentOptionSelected:{ borderColor: '#ff3f6c', backgroundColor: '#fff5f7' },
  paymentOptionText:   { fontSize: 14, color: '#333', marginLeft: 10 },
  paymentOptionTextSelected: { fontWeight: '600', color: '#ff3f6c' },
  radioCircle:         { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  radioCircleSelected: { borderColor: '#ff3f6c' },
  radioDot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff3f6c' },
  summaryRow:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel:        { fontSize: 13, color: '#666' },
  summaryValue:        { fontSize: 13, color: '#333' },
  totalRow:            { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 4 },
  totalLabel:          { fontSize: 15, fontWeight: '700', color: '#282c3f' },
  totalValue:          { fontSize: 15, fontWeight: '700', color: '#ff3f6c' },
  secureRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 4 },
  secureText:          { fontSize: 12, color: '#888' },
  primaryBtn:          { backgroundColor: '#ff3f6c', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 30 },
  primaryBtnDisabled:  { opacity: 0.7 },
  primaryBtnText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Success
  successContainer:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successCircle:       { width: 90, height: 90, borderRadius: 45, backgroundColor: '#e8f8ed', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTick:         { fontSize: 44, color: '#26a541' },
  successTitle:        { fontSize: 24, fontWeight: '700', color: '#282c3f', marginBottom: 10 },
  successSub:          { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  continueBtn:         { backgroundColor: '#ff3f6c', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 14 },
  continueBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  // WebView
  webHeader:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  webCancelBtn:        { color: '#ff3f6c', fontWeight: '600', fontSize: 14 },
  webTitle:            { fontSize: 15, fontWeight: '700', color: '#282c3f' },
  lockRow:             { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockText:            { fontSize: 12, color: '#888' },
  webLoader:           { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  webLoaderText:       { marginTop: 12, color: '#666', fontSize: 14 },
  verifyingOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  verifyingText:       { marginTop: 14, fontSize: 15, color: '#282c3f', fontWeight: '500' },
});