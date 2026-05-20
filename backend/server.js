require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const helmet   = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Security headers ───────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ───────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['https://myntra-clone-five-murex.vercel.app', 'http://localhost:8081'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// ── IMPORTANT: Razorpay webhook needs raw body for HMAC verification ───────
// Mount BEFORE express.json() so the raw buffer is preserved
app.use('/order/webhook', express.raw({ type: 'application/json' }));

// ── Body parsing (all other routes) ───────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ── Rate limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Database connection (optimised for Vercel serverless) ──────────────────
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }
};

// Ensure DB is connected before every request
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/user',        require('./routes/Userroutes'));
app.use('/category',    require('./routes/Categoryroutes'));
app.use('/product',     require('./routes/Productroutes'));   // includes /search
app.use('/wishlist',    require('./routes/Wishlistroutes'));
app.use('/order',       require('./routes/OrderRoutes'));     // includes /webhook
app.use('/bag',         require('./routes/Bagroutes'));
app.use('/transaction', require('./routes/transactionRoutes'));
app.use('/recommend',   require('./routes/RecommendationRoutes'));
app.use('/history',     require('./routes/historyRoutes'));

app.get('/', (req, res) => res.send('✅ Myntra backend is working'));

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('CRASHED AT:', req.url, 'ERROR:', err.stack);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// ── Local dev server ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;