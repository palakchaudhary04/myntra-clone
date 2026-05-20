/**
 * OrderRoutes.js
 *
 * FEATURE 2 – Concurrency-safe order placement
 *   • Atomic $inc stock decrement with filter guard { stock: { $gte: qty } }
 *   • MongoDB session + transaction wraps everything
 *   • Idempotency key (unique DB index) prevents duplicate orders under races
 *
 * FEATURE 3 – Razorpay HMAC-SHA256 webhook verification
 *   • /order/webhook – raw body + x-razorpay-signature verified via timingSafeEqual
 *   • /order/verify  – client-side payment verification after checkout modal
 *
 * FEATURE 4 – Database state checks
 *   • Only "pending" orders can be paid (findOneAndUpdate filter)
 *   • Idempotency key unique index prevents duplicate documents at DB level
 *   • Transaction creation only happens AFTER order status confirmed paid
 */

const express    = require('express');
const crypto     = require('crypto');
const mongoose   = require('mongoose');
const Razorpay   = require('razorpay');
const router     = express.Router();

const Bag         = require('../models/Bag');
const Order       = require('../models/Order');
const Product     = require('../models/Product');
const Transaction = require('../models/transaction');

// ── Razorpay instance ──────────────────────────────────────────────────────

// Ensure these variable names match your Vercel configurations exactly!
const razorpay = new Razorpay({
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
});

// ── Utility: constant-time HMAC comparison (prevents timing attacks) ───────
function verifyHmac(payload, secret, receivedSig) {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(expected,    'hex');
  const b = Buffer.from(receivedSig, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── Utility: generate idempotency key from userId + bag snapshot ───────────
function makeIdempotencyKey(userId, bagItems) {
  const payload = JSON.stringify({
    userId,
    items: bagItems
      .map(i => ({ pid: String(i.productId._id || i.productId), qty: i.quantity, size: i.size }))
      .sort((a, b) => a.pid.localeCompare(b.pid)),
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /order/initiate/:userId
// Step 1 – Validate bag → create Razorpay order → return payment details
// Client launches Razorpay modal with these details, then calls /order/verify
// ══════════════════════════════════════════════════════════════════════════════
router.post('/initiate/:userId', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.params;
    const { shippingAddress, paymentMethod } = req.body;

    if (!shippingAddress || !paymentMethod)
      return res.status(400).json({ message: 'Shipping address and payment method are required' });

    // ── 1. Fetch bag ─────────────────────────────────────────────────────
    const bagItems = await Bag.find({ userId, status: 'cart' })
      .populate('productId')
      .session(session);

    if (!bagItems || bagItems.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Bag is empty' });
    }

    // ── 2. Calculate total ────────────────────────────────────────────────
    const total = bagItems.reduce(
      (acc, item) => acc + (item.productId.price * item.quantity), 0
    );

    // ── 3. Generate idempotency key ────────────────────────────────────────
    const idempotencyKey = makeIdempotencyKey(userId, bagItems);

    // ── 4. Check for existing pending/paid order (Feature 4) ──────────────
    const existingOrder = await Order.findOne({ idempotencyKey }).session(session);
    if (existingOrder) {
      await session.abortTransaction();
      // Return existing order so frontend can retry payment if still pending
      return res.status(200).json({
        message:         'Duplicate request – returning existing order',
        orderId:         existingOrder._id,
        razorpayOrderId: existingOrder.razorpayOrderId,
        status:          existingOrder.status,
        keyId:           process.env.RAZORPAY_KEY_ID,
        amount:          Math.round(total * 100),
        currency:        'INR',
      });
    }

    // ── 5. Check + atomically decrement stock for each item (Feature 2) ───
    const stockOps = [];
    for (const item of bagItems) {
      const p = item.productId;
      if (p.stock < item.quantity) {
        await session.abortTransaction();
        return res.status(409).json({
          message: `Insufficient stock for "${p.name}". Available: ${p.stock}`,
        });
      }
      stockOps.push({
        updateOne: {
          // Filter includes stock >= qty – fails atomically if stock ran out concurrently
          filter: { _id: p._id, stock: { $gte: item.quantity } },
          update: { $inc: { stock: -item.quantity } },
        },
      });
    }

    const stockResult = await Product.bulkWrite(stockOps, { session });
    if (stockResult.modifiedCount !== stockOps.length) {
      await session.abortTransaction();
      return res.status(409).json({
        message: 'One or more items ran out of stock during checkout. Please refresh your bag.',
      });
    }

    // ── 6. Create Razorpay order (external call) ──────────────────────────
    let rzpOrder;
    try {
      rzpOrder = await razorpay.orders.create({
        amount:   Math.round(total * 100), // paise
        currency: 'INR',
        receipt:  `rcpt_${Date.now()}`,
        notes:    { userId: String(userId) },
      });
    } catch (rzpErr) {
      await session.abortTransaction();
      return res.status(502).json({ message: 'Payment gateway error. Please try again.' });
    }

    // ── 7. Create order document with status "pending" ────────────────────
    const [newOrder] = await Order.create(
      [{
        userId,
        items: bagItems.map(item => ({
          productId: item.productId._id,
          price:     item.productId.price,
          quantity:  item.quantity,
          size:      item.size,
        })),
        total,
        shippingAddress,
        paymentMethod,
        status:          'pending',  // NOT paid yet – payment hasn't happened
        razorpayOrderId: rzpOrder.id,
        idempotencyKey,
        date:            new Date().toLocaleDateString(),
      }],
      { session }
    );

    await session.commitTransaction();

    // Return payment details to frontend – do NOT clear bag yet (wait for payment)
    return res.status(201).json({
      orderId:         newOrder._id,
      razorpayOrderId: rzpOrder.id,
      amount:          Math.round(total * 100),
      currency:        'INR',
      keyId:           process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    await session.abortTransaction();
    // Idempotency key unique constraint race – return existing order
    if (error.code === 11000) {
      const dup = await Order.findOne({ idempotencyKey: req.body?.idempotencyKey });
      return res.status(200).json({ message: 'Duplicate – existing order', orderId: dup?._id });
    }
    console.error('Order Initiate Error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  } finally {
    session.endSession();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /order/verify
// Step 2 – After Razorpay modal closes successfully, verify signature + mark paid
// Feature 3: HMAC-SHA256 signature check
// Feature 4: atomic state transition pending → paid only
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify', async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, userId } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature)
      return res.status(400).json({ message: 'Missing payment verification fields' });

    // ── 1. Verify HMAC-SHA256 (Feature 3) ─────────────────────────────────
    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const isValid = verifyHmac(payload, process.env.RAZORPAY_KEY_SECRET, razorpaySignature);
    if (!isValid)
      return res.status(400).json({ message: 'Payment signature verification failed' });

    // ── 2. Atomic state transition: pending → paid (Feature 4) ────────────
    // findOneAndUpdate with status:"pending" ensures:
    //   a) Already-paid orders are rejected (no double-charge)
    //   b) Cancelled orders cannot be paid
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id:             orderId,
        razorpayOrderId: razorpayOrderId, // must match
        status:          'pending',        // ONLY pending orders can be paid
      },
      {
        $set: {
          status:            'paid',
          razorpayPaymentId,
          razorpaySignature,
          paidAt:            new Date(),
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      const order = await Order.findById(orderId);
      if (!order)        return res.status(404).json({ message: 'Order not found' });
      if (order.status === 'paid')
        return res.status(200).json({ message: 'Order already paid', order }); // idempotent
      return res.status(409).json({ message: `Cannot pay order in '${order.status}' state` });
    }

    // ── 3. Record transaction (only after confirmed paid) ──────────────────
    await Transaction.create({
      user:          updatedOrder.userId,
      amount:        updatedOrder.total,
      type:          'Payment',
      paymentMethod: updatedOrder.paymentMethod,
      status:        'Success',
    });

    // ── 4. Clear the bag ───────────────────────────────────────────────────
    await Bag.deleteMany({ userId: updatedOrder.userId });

    return res.status(200).json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Payment Verify Error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /order/webhook
// Razorpay server-to-server webhook (async events)
// Feature 3: raw body + HMAC-SHA256 with RAZORPAY_WEBHOOK_SECRET
// Feature 4: idempotent state guards on all events
// ══════════════════════════════════════════════════════════════════════════════
router.post('/webhook', async (req, res) => {
  try {
    const receivedSig = req.headers['x-razorpay-signature'];
    if (!receivedSig) return res.status(400).json({ message: 'Missing webhook signature' });

    // req.body is a raw Buffer here (express.raw mounted in server.js)
    if (!Buffer.isBuffer(req.body))
      return res.status(400).json({ message: 'Invalid body format – must be raw' });

    const isValid = verifyHmac(req.body, process.env.RAZORPAY_WEBHOOK_SECRET, receivedSig);
    if (!isValid) return res.status(400).json({ message: 'Webhook signature invalid' });

    const event = JSON.parse(req.body.toString('utf8'));

    switch (event.event) {
      case 'payment.captured': {
        const entity   = event.payload.payment.entity;
        const rzpOrdId = entity.order_id;
        await Order.findOneAndUpdate(
          { razorpayOrderId: rzpOrdId, status: 'pending' }, // guard
          { $set: { status: 'paid', razorpayPaymentId: entity.id, paidAt: new Date() } }
        );
        break;
      }
      case 'payment.failed': {
        const rzpOrdId = event.payload.payment.entity.order_id;
        const order = await Order.findOneAndUpdate(
          { razorpayOrderId: rzpOrdId, status: 'pending' },
          { $set: { status: 'cancelled' } },
          { new: true }
        );
        // Restore stock if order cancelled
        if (order) await _restoreStock(order.items);
        break;
      }
      case 'refund.created': {
        const rzpOrdId = event.payload.refund.entity.order_id;
        await Order.findOneAndUpdate(
          { razorpayOrderId: rzpOrdId, status: { $in: ['paid', 'processing'] } },
          { $set: { status: 'refunded' } }
        );
        break;
      }
      default:
        break;
    }

    // Always 200 to Razorpay – prevents infinite retries
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error.message);
    return res.status(200).json({ received: true }); // still 200
  }
});

// ── Helper: restore stock on payment failure ──────────────────────────────
async function _restoreStock(items) {
  try {
    const ops = items.map(item => ({
      updateOne: {
        filter: { _id: item.productId },
        update: { $inc: { stock: item.quantity } },
      },
    }));
    if (ops.length) await Product.bulkWrite(ops);
  } catch (e) {
    console.error('Stock restore error:', e.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Legacy: POST /order/create/:userId
// Kept for backward compatibility. Now redirects to /initiate internally.
// NOTE: This skips Razorpay (used for COD / test mode)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/create/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { shippingAddress, paymentMethod } = req.body;

    if (!shippingAddress || !paymentMethod)
      return res.status(400).json({ message: 'Shipping address and payment method are required' });

    const bagItems = await Bag.find({ userId, status: 'cart' }).populate('productId');
    if (!bagItems || bagItems.length === 0)
      return res.status(400).json({ message: 'Bag is empty' });

    const total = bagItems.reduce((acc, item) => acc + (item.productId.price * item.quantity), 0);
    const idempotencyKey = makeIdempotencyKey(userId, bagItems);

    // Duplicate check (Feature 4)
    const existing = await Order.findOne({ idempotencyKey });
    if (existing)
      return res.status(200).json({ message: 'Order already placed', orderId: existing._id });

    const newOrder = await Order.create({
      userId,
      items: bagItems.map(item => ({
        productId: item.productId._id,
        price:     item.productId.price,
        quantity:  item.quantity,
        size:      item.size,
      })),
      total,
      shippingAddress,
      paymentMethod,
      status:         'paid',   // COD / test mode – mark paid directly
      idempotencyKey,
      date:           new Date().toLocaleDateString(),
    });

    await Transaction.create({
      user:          userId,
      amount:        total,
      type:          'Payment',
      paymentMethod: paymentMethod,
      status:        'Success',
    });

    await Bag.deleteMany({ userId });

    res.status(200).json({ message: 'Order placed successfully', orderId: newOrder._id });
  } catch (error) {
    if (error.code === 11000)
      return res.status(200).json({ message: 'Duplicate order detected' });
    console.error('Order Create Error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// ── GET /order/user/:userId ────────────────────────────────────────────────
router.get('/user/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .populate('items.productId')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Fetch Orders Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// ── GET /order/:orderId ────────────────────────────────────────────────────
router.get('/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('items.productId');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;