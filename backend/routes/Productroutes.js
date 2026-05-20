/**
 * Productroutes.js
 *
 * FEATURE 1 – Multi-field search engine
 *   • /product/search  – weighted $text index + per-field regex fallback
 *   • All user input escaped with escapeRegex() before entering RegExp
 *   • Query params whitelisted – no prototype pollution possible
 */

const express = require('express');
const Product = require('../models/Product');
const router  = express.Router();

// ── Utility: escape regex special characters (prevents ReDoS / injection) ──
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Utility: whitelist + sanitize query params ─────────────────────────────
function sanitizeQuery(raw) {
  const allowed = ['q', 'category', 'brand', 'minPrice', 'maxPrice', 'sort', 'page', 'limit', 'size'];
  const out = Object.create(null); // no prototype – no pollution
  for (const key of allowed) {
    if (raw[key] !== undefined) {
      out[key] = String(raw[key]).replace(/\0/g, '').trim(); // strip null bytes
    }
  }
  return out;
}

// ── GET /product/search ────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const params = sanitizeQuery(req.query);

    const page  = Math.max(1,  parseInt(params.page)  || 1);
    const limit = Math.min(50, parseInt(params.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter = {};

    // 1. Full-text search on q (uses weighted MongoDB text index)
    if (params.q) {
      if (params.q.length > 100) return res.status(400).json({ message: 'Search query too long' });
      filter.$text = { $search: params.q };
    }

    // 2. Category – exact match, case-insensitive, sanitized regex
    if (params.category) {
      filter.category = new RegExp(`^${escapeRegex(params.category)}$`, 'i');
    }

    // 3. Brand – supports comma-separated list e.g. brand=Nike,Puma
    if (params.brand) {
      const brands = params.brand
        .split(',')
        .map(b => b.trim())
        .filter(Boolean)
        .slice(0, 10)
        .map(b => new RegExp(`^${escapeRegex(b)}$`, 'i'));
      filter.brand = brands.length === 1 ? brands[0] : { $in: brands };
    }

    // 4. Size filter
    if (params.size) {
      const sizes = params.size.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 10);
      filter.sizes = { $in: sizes };
    }

    // 5. Price range
    const priceFilter = {};
    const minP = parseFloat(params.minPrice);
    const maxP = parseFloat(params.maxPrice);
    if (!isNaN(minP) && minP >= 0) priceFilter.$gte = minP;
    if (!isNaN(maxP) && maxP >= 0) priceFilter.$lte = maxP;
    if (Object.keys(priceFilter).length) filter.price = priceFilter;

    // 6. Sort
    const SORT_MAP = {
      relevance:  filter.$text ? { score: { $meta: 'textScore' } } : { createdAt: -1 },
      price_asc:  { price: 1 },
      price_desc: { price: -1 },
      rating:     { rating: -1 },
      newest:     { createdAt: -1 },
      discount:   { discount: -1 },
    };
    const sort = SORT_MAP[params.sort] || SORT_MAP.relevance;

    // 7. Projection – include text score when sorting by relevance
    const projection = filter.$text ? { score: { $meta: 'textScore' } } : {};

    const [products, total] = await Promise.all([
      Product.find(filter, projection).sort(sort).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      results: products,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
});

// ── GET /product/search/suggestions (autocomplete, max 8) ─────────────────
router.get('/search/suggestions', async (req, res) => {
  try {
    const raw = req.query.q;
    if (!raw || typeof raw !== 'string') return res.json([]);
    const q = String(raw).replace(/\0/g, '').trim().slice(0, 50);
    if (q.length < 2) return res.json([]);

    const regex = new RegExp(escapeRegex(q), 'i');
    const products = await Product.find(
      { $or: [{ name: regex }, { brand: regex }, { category: regex }] },
      { name: 1, brand: 1, category: 1 }
    ).limit(8).lean();

    const seen = new Set();
    const out  = [];
    for (const p of products) {
      if (!seen.has(p.name))     { seen.add(p.name);     out.push({ label: p.name,     type: 'product'  }); }
      if (!seen.has(p.brand))    { seen.add(p.brand);    out.push({ label: p.brand,    type: 'brand'    }); }
      if (!seen.has(p.category)) { seen.add(p.category); out.push({ label: p.category, type: 'category' }); }
    }
    res.json(out.slice(0, 8));
  } catch (error) {
    res.status(500).json({ message: 'Suggestion error' });
  }
});

// ── GET /product ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().lean();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// ── GET /product/category/:category ───────────────────────────────────────
router.get('/category/:category', async (req, res) => {
  try {
    // Sanitize path param as well
    const safeCategory = escapeRegex(req.params.category);
    const products = await Product.find({
      category: new RegExp(`^${safeCategory}$`, 'i'),
    }).lean();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// ── GET /product/:id ───────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

module.exports = router;