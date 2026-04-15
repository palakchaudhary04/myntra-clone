const express = require("express");
const Bag = require("../models/Bag");
const Order = require("../models/Order");
const router = express.Router();

function generateRandomTracking() {
  const carriers = ["Delhivery", "Bluedart", "Ecom Express", "XpressBees"];
  const statusOptions = ["Shipped", "Out for Delivery", "Delivered", "In Transit"];
  const locations = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune"];

  const randomCarrier = carriers[Math.floor(Math.random() * carriers.length)];
  const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
  const randomLocation = locations[Math.floor(Math.random() * locations.length)];

  return {
    number: "TRK" + Math.floor(Math.random() * 10000000),
    carrier: randomCarrier,
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    currentLocation: randomLocation,
    status: randomStatus,
    timeline: [
      {
        status: "Order placed",
        location: "Warehouse",
        timestamp: new Date().toISOString(),
      },
      {
        status: randomStatus,
        location: randomLocation,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

router.post("/create/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const bag = await Bag.find({ userId }).populate("productId");

    if (bag.length === 0) {
      return res.status(400).json({ message: "No items in the bag" });
    }

    const orderItems = bag.map((item) => ({
      productId: item.productId._id,
      size: item.size,
      price: item.productId.price,
      quantity: item.quantity,
    }));

    // Fixed: was `price + quantity` (wrong), now `price * quantity` (correct)
    const total = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const newOrder = new Order({
      userId,
      date: new Date().toISOString(),
      status: "Processing",
      items: orderItems,   // Fixed: was `item`, schema expects `items`
      total,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      tracking: generateRandomTracking(),
    });

    await newOrder.save();
    await Bag.deleteMany({ userId });

    res.status(201).json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/user/:userid", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userid }).populate(
      "items.productId"
    );
    res.status(200).json(orders);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;