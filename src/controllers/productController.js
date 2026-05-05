// src/controllers/productController.js
const express = require("express");
const router  = express.Router();
const {
  runScraping,
  getAllProducts,
  getProductById,
} = require("../services/productService");
const { analyzePriceTrend, analyzeRating } = require("../services/aiService");
const {
  findProductById,
  findHistoryByProductId,
  deleteProduct,
} = require("../repositories/productRepository");

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const data  = await getAllProducts({ page, limit });
    return res.status(200).json(data);
  } catch (error) {
    console.error("[GET /products]", error.message);
    return res.status(500).json({ error: "Erro ao buscar produtos." });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });
    const data = await getProductById(id);
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
    const data = await runScraping();
    return res.status(200).json(data);
  } catch (error) {
    console.error("[POST /products/scrape]", error.message);
    return res.status(500).json({ error: "Erro ao executar scraping." });
  }
});

// GET /api/products/:id/analyze
router.get("/:id/analyze", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });

    const product = await findProductById(id);
    if (!product) return res.status(404).json({ error: "Produto não encontrado." });

    const history = await findHistoryByProductId(id);

    const [priceAnalysis, ratingAnalysis] = await Promise.all([
      analyzePriceTrend(product.titulo, history),
      analyzeRating(product.titulo, product.rating, product.reviewTexts ?? [])
    ]);

    return res.status(200).json({ priceAnalysis, ratingAnalysis });
  } catch (error) {
    console.error("[GET /products/:id/analyze]", error.message);
    return res.status(500).json({ error: "Erro ao analisar produto." });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });
    await deleteProduct(id);
    return res.status(200).json({ message: "Produto removido com sucesso." });
  } catch (error) {
    console.error("[DELETE /products/:id]", error.message);
    const status = error.message.includes("não encontrado") ? 404 : 500;
    return res.status(status).json({ error: error.message });
  }
});

module.exports = router;