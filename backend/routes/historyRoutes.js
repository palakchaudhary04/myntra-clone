const express = require("express");
const router = express.Router();
const History = require("../models/History"); // Correctly pointing to the model

router.post("/add", async (req, res) => {
    try {
        const { userId, productId } = req.body;
        const newHistory = new History({ userId, productId });
        await newHistory.save();
        res.status(200).json({ message: "History saved successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/user/:userId", async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
});

module.exports = router;