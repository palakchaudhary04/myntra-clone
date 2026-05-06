const mongoose = require("mongoose");

const BagItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    size: String,
    quantity: Number,
    status: { type: String, enum: ['cart', 'saved'], default: 'cart' },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bag", BagItemSchema);