require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Initialize Express
const app = express();

// 1. Middleware
app.use(express.json());

// 2. Updated CORS for Security
// Using "*" is okay for testing, but eventually, you should use your Vercel frontend URL
app.use(cors({ 
    origin: "*", 
    methods: ['GET', 'POST', 'PUT', 'DELETE'], 
    credentials: true 
}));

// 3. Database Connection Logic (Optimized for Vercel)
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return; // Use existing connection if available
    
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err.message);
        // Don't exit process in Vercel environment; let it retry or fail gracefully
    }
};

// 4. Import Routes
const Userroutes = require("./routes/Userroutes");
const Categoryroutes = require("./routes/Categoryroutes");
const Productroutes = require("./routes/Productroutes");
const Wishlistroutes = require("./routes/Wishlistroutes");
const OrderRoutes = require("./routes/OrderRoutes");
const Bagroutes = require("./routes/absdroutes");
const transactionRoutes = require("./routes/transactionRoutes");
const historyRoutes = require("./routes/historyRoutes");
const RecommendationRoutes = require("./routes/RecommendationRoutes");

// 5. API Routes
// Note: We call connectDB() inside a middleware or before routes to ensure connection in serverless
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

app.get("/", (req, res) => {
    res.send("✅ Myntra backend is working");
});

app.use("/user", Userroutes);
app.use("/category", Categoryroutes);
app.use("/product", Productroutes);
app.use("/wishlist", Wishlistroutes);
app.use("/order", OrderRoutes);
app.use("/bag", Bagroutes);
app.use("/transaction", transactionRoutes);
app.use("/recommend", RecommendationRoutes);
app.use("/history", historyRoutes);

// 6. Global Error Handler
app.use((err, req, res, next) => {
    console.error("CRASHED AT:", req.url, "ERROR:", err.stack);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
});

// 7. Start Server (For local development)
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Export for Vercel
module.exports = app;
