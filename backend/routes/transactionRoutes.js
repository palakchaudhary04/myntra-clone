const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const { Parser } = require("json2csv");

// GET: Filtered Transactions for the UI
router.get("/user/:userId", async (req, res) => {
  try {
    const { type } = req.query;
    let query = { userId: req.params.userId };
    if (type && type !== "All") query.type = type;

    const transactions = await Transaction.find(query).sort({ date: -1 });
    res.json(transactions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET: Export to CSV
router.get("/export/:userId", async (req, res) => {
  try {
    const data = await Transaction.find({ userId: req.params.userId }).lean();
    if (data.length === 0) return res.status(404).send("No data to export");

    const json2csvParser = new Parser({ fields: ['date', 'amount', 'type', 'status'] });
    const csv = json2csvParser.parse(data);
    
    res.header('Content-Type', 'text/csv');
    res.attachment('transactions.csv');
    res.send(csv);
  } catch (err) { res.status(500).send(err.message); }
});

module.exports = router;