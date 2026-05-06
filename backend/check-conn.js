require('dotenv').config();
const mongoose = require('mongoose');

console.log("Attempting connection with:", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ SUCCESS: Connected to MongoDB!");
    process.exit();
  })
  .catch((err) => {
    console.error("❌ FAILED: Could not connect.");
    console.error(err);
    process.exit(1);
  });