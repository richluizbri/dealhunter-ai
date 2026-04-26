// src/controllers/productController.js
const express = require("express");
const router  = express.Router();
const {
  runScraping,
  getAllProducts,
  getProductById,
} = require("../services/productService");
const { analyzePriceHistory, analyzeRating } = require("../services/aiService");
const { findProductById, findHistoryByProductId } = require("../repositories/productRepository");

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const data = await getAllProducts();
    return res.status(200).json(data);
  } catch (error) {
    console.error("[GET /products]", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const data = await getProductById(req.params.id);
    return res.status(200).json(data);
  } catch (error) {
    console.error("[GET /products/:id]", error.message);
    const status = error.message.includes("não encontrado") ? 404 : 500;
    return res.status(status).json({ error: error.message });
  }
});

// POST /api/products/scrape
router.post("/scrape", async (req, res) => {
  try {
    const io   = req.app.get("io");
    const data = await runScraping(io);
    return res.status(200).json(data);
  } catch (error) {
    console.error("[POST /products/scrape]", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/products/:id/analyze
router.get("/:id/analyze", async (req, res) => {
  try {
    const id      = Number(req.params.id);
    const product = await findProductById(id);

    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    const history = await findHistoryByProductId(id);

    const [priceAnalysis, ratingAnalysis] = await Promise.all([
      analyzePriceHistory(product, history),
      analyzeRating(product),
    ]);

    return res.status(200).json({ priceAnalysis, ratingAnalysis });
  } catch (error) {
    // Log detalhado do erro
    console.error("[GET /products/:id/analyze] ERRO COMPLETO:", error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;