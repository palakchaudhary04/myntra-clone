const mongoose = require('mongoose');

const TimelineSchema = new mongoose.Schema({
  status:    String,
  location:  String,
  timestamp: String,
});

const TrackingSchema = new mongoose.Schema({
  number:            String,
  carrier:           String,
  estimatedDelivery: String,
  currentLocation:   String,
  status:            String,
  timeline:          [TimelineSchema],
});

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  size:      String,
  price:     Number,
  quantity:  { type: Number, min: 1 },
});

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    items:           [OrderItemSchema],
    total:           { type: Number, required: true, min: 0 },
    shippingAddress: { type: String, required: true },
    paymentMethod:   { type: String, required: true },

    // ── State machine (Feature 4) ──────────────────────────────────────────
    // Only "pending" orders can be paid. Prevents double-charging.
    status: {
      type:    String,
      enum:    ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
      index:   true,
    },

    // ── Payment fields (Feature 3) ─────────────────────────────────────────
    razorpayOrderId:   { type: String, sparse: true, index: true },
    razorpayPaymentId: { type: String, sparse: true },
    razorpaySignature: { type: String },
    paidAt:            { type: Date },

    // ── Idempotency key (Feature 4: no duplicate orders) ──────────────────
    // Unique at DB level – second insert with same key fails immediately
    idempotencyKey: {
      type:   String,
      unique: true,
      sparse: true,   // allows null for old orders
      index:  true,
    },

    tracking: TrackingSchema,
    date:     String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);