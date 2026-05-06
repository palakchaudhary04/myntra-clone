router.get("/recommend/:productId", async (req, res) => {
  try {
    const { userId } = req.query; // Send userId from frontend
    const currentProduct = await Product.findById(req.params.productId);

    // 1. Get user's view history to avoid showing items they've already seen
    const userHistory = await UserHistory.findOne({ userId });
    const viewedIds = userHistory ? userHistory.viewedProducts : [];

    // 2. Intelligent Query: Category match + exclude viewed items
    const recommendations = await Product.find({
      category: currentProduct.category,
      _id: { $ne: req.params.productId, $nin: viewedIds } 
    }).limit(5);

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch" });
  }
});