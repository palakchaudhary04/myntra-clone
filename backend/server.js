require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

// 1. Load environment variables


const app = express();

// 2. Middleware
app.use(express.json());
app.use(cors({ origin: "*",methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true }));
app.use((err, req, res, next) => {
  console.error("CRASHED AT:", req.url, "ERROR:", err.stack);
  res.status(500).send("Something broke!");
});
// 3. Import Routes
const userrouter = require("./routes/Userroutes");
const categoryrouter = require("./routes/Categoryroutes");
const productrouter = require("./routes/Productroutes");
const Wishlistroutes = require("./routes/Wishlistroutes");
const OrderRoutes = require("./routes/OrderRoutes");
const BagRoutes = require("./routes/BagRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const historyRoutes = require("./routes/historyRoutes");
const recommendationRoutes = require("./routes/RecommendationRoutes");
// In orders.tsx

// 4. Base Route  
app.get("/", (req, res) => {
  res.send("✅ Myntra backend is working");
});

// 5. API Routes
app.use("/user", userrouter);
app.use("/category", categoryrouter);
app.use("/product", productrouter);
app.use("/wishlist", Wishlistroutes);
app.use("/order", OrderRoutes);   // ✅ fixed casing
app.use("/bag", BagRoutes);     // for frontend compatibility
app.use("/transaction", transactionRoutes);
app.use("/recommend", recommendationRoutes);
app.use("/history", historyRoutes);
// 6. Start Server ONLY after DB connects
const startServer = async () => {
  try {
    console.log("Attempting to connect to:", process.env.MONGO_URI);
    mongoose.connect(process.env.MONGO_URI, {
  family: 4,
});

    console.log("✅ MongoDB connected");

    // Ensure this is your app.listen block
const PORT = 5000;
const HOST = '0.0.0.0'; // THIS IS THE KEY: '0.0.0.0' allows outside connections

app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});
  } catch (err) {
    console.error("❌ MongoDB connection error:");
    console.error(err.message);
    process.exit(1); // stop if DB fails
  }
};

// 7. Run server
startServer();