const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
    userId: { type: String, required: true },
    productId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('History', HistorySchema);