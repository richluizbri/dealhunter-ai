
// src/controllers/productController.js
const express = require("express");
const router  = express.Router();
const {
  runScraping,
  addProductByUrl,
  getAllProducts,
  getProductById,
} = require("../services/productService");

// [CORREÇÃO] analyzePriceHistory → analyzePriceTrend
// Nome corrigido para bater com o export real do aiService.js
const { analyzePriceTrend, analyzeRating } = require("../services/aiService");
const {
  findProductById,
  findHistoryByProductId,
  deleteProduct,
} = require("../repositories/productRepository");

// ── GET /api/products ────────────────────────────────────────────────────────
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

// ── GET /api/products/:id ────────────────────────────────────────────────────
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

// ── POST /api/products/scrape ────────────────────────────────────────────────
router.post("/scrape", async (req, res) => {
  try {
    // [CORREÇÃO] Removido io como argumento — runScraping() usa getIO() internamente
    const data = await runScraping();
    return res.status(200).json(data);
  } catch (error) {
    console.error("[POST /products/scrape]", error.message);
    return res.status(500).json({ error: "Erro ao executar scraping." });
  }
});

// ── POST /api/products — Adiciona produto manualmente por URL ────────────────
router.post("/", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Informe uma URL válida no body: { url: '...' }" });
    }

    try { new URL(url); } catch {
      return res.status(400).json({ error: "URL inválida. Forneça uma URL completa com http:// ou https://" });
    }

    const product = await addProductByUrl(url);
    return res.status(201).json({ message: "Produto adicionado com sucesso!", product });
  } catch (error) {
    console.error("[POST /products]", error.message);
    return res.status(500).json({ error: "Erro ao adicionar produto." });
  }
});

// ── GET /api/products/:id/analyze ────────────────────────────────────────────
router.get("/:id/analyze", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });

    const product = await findProductById(id);
    if (!product) return res.status(404).json({ error: "Produto não encontrado." });

    const history = await findHistoryByProductId(id);

    // [CORREÇÃO 3.1] Mensagens de erro da IA nunca chegam ao frontend —
    // o _safeCall() do aiService já retorna fallback amigável em caso de falha.
    //
    // [CORREÇÃO 3.2] analyzeRating agora recebe o rating do produto E o
    // array reviewTexts salvo no banco (campo adicionado via scraping).
    // analyzePriceTrend recebe o titulo e o histórico completo de preços.
    const [priceAnalysis, ratingAnalysis] = await Promise.all([
      analyzePriceTrend(product.titulo, history),
      // [CORREÇÃO] era analyzeRating(product) — não passava rating nem reviewTexts.
      // Agora passa os dois campos corretamente.
      analyzeRating(product.titulo, product.rating, product.reviewTexts ?? []);
    ]);

    return res.status(200).json({ priceAnalysis, ratingAnalysis });
  } catch (error) {
    console.error("[GET /products/:id/analyze]", error.message);
    return res.status(500).json({ error: "Erro ao analisar produto." });
  }
});

// ── DELETE /api/products/:id ──────────────────────────────────────────────────
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