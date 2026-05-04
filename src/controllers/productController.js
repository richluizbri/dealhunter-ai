// src/controllers/productController.js
const express = require("express");
const router  = express.Router();
const {
  runScraping,
  addProductByUrl,
  getAllProducts,
  getProductById,
} = require("../services/productService");
const { analyzePriceHistory, analyzeRating } = require("../services/aiService");
const { findProductById, findHistoryByProductId, deleteProduct } = require("../repositories/productRepository");

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const data  = await getAllProducts({ page, limit });
    return res.status(200).json(data);
  } catch (error) {
    console.error("[GET /products]", error.message);
    return res.status(500).json({ error: error.message });
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
    const io   = req.app.get("io");
    const data = await runScraping(io);
    return res.status(200).json(data);
  } catch (error) {
    console.error("[POST /products/scrape]", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 4.2 — POST /api/products — Adiciona um produto manualmente por URL
// Recebe { "url": "https://..." } no body e o Puppeteer extrai os dados
router.post("/", async (req, res) => {
  try {
    const { url } = req.body;

    // Valida se a URL foi enviada
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Informe uma URL válida no body: { url: '...' }" });
    }

    // Valida se é uma URL válida
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "URL inválida. Forneça uma URL completa com http:// ou https://" });
    }

    const product = await addProductByUrl(url);

    // 201 Created — indica que um novo recurso foi criado
    return res.status(201).json({
      message: "Produto adicionado com sucesso!",
      product,
    });
  } catch (error) {
    console.error("[POST /products]", error.message);
    return res.status(500).json({ error: error.message });
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
      analyzePriceHistory(product, history),
      analyzeRating(product),
    ]);

    return res.status(200).json({ priceAnalysis, ratingAnalysis });
  } catch (error) {
    console.error("[GET /products/:id/analyze]", error.message);
    return res.status(500).json({ error: error.message });
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