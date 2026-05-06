const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// This matches your URL exactly
router.get("/personalized/:userId", async (req, res) => {
  try {
    const { category } = req.query; // Grabs the '?category=...' part
    
    // Find products matching the category, limit to 5
    const products = await Product.find({ category: category }).limit(5);
    
    res.json(products);
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;