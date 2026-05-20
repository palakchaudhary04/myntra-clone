const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    brand:       { type: String, required: true, trim: true },
    category:    { type: String, default: '', trim: true },
    price:       { type: Number, required: true, min: 0 },
    discount:    { type: Number, default: 0 },   // changed to Number for math
    description: { type: String, default: '' },
    sizes:       [{ type: String }],
    images:      [{ type: String }],
    stock:       { type: Number, default: 100, min: 0 },  // NEW – for atomic decrement
    rating:      { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── Multi-field weighted text index (Feature 1: search) ───────────────────
ProductSchema.index(
  { name: 'text', brand: 'text', category: 'text', description: 'text' },
  { weights: { name: 10, brand: 8, category: 6, description: 1 }, name: 'product_text_idx' }
);

// ── Compound indexes for filter performance ────────────────────────────────
ProductSchema.index({ category: 1, price: 1 });
ProductSchema.index({ brand: 1 });

module.exports = mongoose.model('Product', ProductSchema);