const express = require("express");
const router = express.Router();
const Bag = require("../models/Bag");
const Order = require("../models/Order");
const Transaction = require("../models/Transaction");

// 1. CREATE ORDER ROUTE
router.post("/create/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { shippingAddress, paymentMethod } = req.body;

    // Validate inputs
    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({ message: "Shipping address and payment method are required" });
    }
    // Inside router.post("/create/:userId", ...)
await Transaction.create({
  user: userId,
  amount: total,
  type: "Payment",
  paymentMethod: paymentMethod, // Now capturing the mode used in checkout
  status: "Success"
});

    // 1. Fetch bag & check if empty
    const bagItems = await Bag.find({ userId }).populate("productId");
    if (!bagItems || bagItems.length === 0) {
      return res.status(400).json({ message: "Bag is empty" });
    }

    // 2. Calculate totals
    const total = bagItems.reduce((acc, item) => acc + (item.productId.price * item.quantity), 0);

    // 3. Create Order
    const newOrder = new Order({
      userId,
      items: bagItems.map(item => ({ 
        productId: item.productId._id, 
        price: item.productId.price, 
        quantity: item.quantity 
      })),
      total,
      shippingAddress,
      paymentMethod,
      status: "Processing"
    });
    await newOrder.save();

    // 4. Record Transaction
    // Ensure 'status' matches your Transaction model enum (e.g., 'Success', 'Completed')
    await Transaction.create({
      user: userId,
      amount: total,
      type: "Payment",
      status: "Success" 
    });

    // 5. Cleanup Bag
    await Bag.deleteMany({ userId });

    res.status(200).json({ message: "Order placed successfully", orderId: newOrder._id });
  } catch (error) {
    console.error("Critical Order Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

// 2. GET USER ORDERS ROUTE
// This must match your frontend api.get('/order/user/${user._id}')
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Populate productId to get full item details (image, name, etc.)
    const orders = await Order.find({ userId })
      .populate("items.productId") 
      .sort({ createdAt: -1 }); // Newest orders first

    res.status(200).json(orders);
  } catch (error) {
    console.error("Fetch Orders Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;