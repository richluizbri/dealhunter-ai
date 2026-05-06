// src/controllers/productController.js
const express = require("express");
const router  = express.Router();
const { z }   = require("zod");
const {
  runScraping,
  scrapeProductById,
  addProductByUrl,
  getAllProducts,
  getProductById,
} = require("../services/productService");
const { analyzePriceTrend, analyzeRating } = require("../services/aiService");
const {
  findProductById,
  findHistoryByProductId,
  deleteProduct,
} = require("../repositories/productRepository");

// ── Schemas de validação ──────────────────────────────────────────────────────

const idSchema = z.coerce.number().int().positive({ message: "ID deve ser um número inteiro positivo." });

const paginationSchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const urlSchema = z.object({
  url: z.string().url({ message: "URL inválida. Forneça uma URL completa com http:// ou https://" }),
});

// ── Helper para retornar erros de validação ───────────────────────────────────

function validationError(res, error) {
  const message = error.errors?.[0]?.message || "Dados inválidos.";
  return res.status(400).json({ error: message });
}

// ── GET /api/products ─────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);

    const { page, limit } = parsed.data;
    const data = await getAllProducts({ page, limit });
    return res.status(200).json(data);
  } catch (error) {
    console.error("[GET /products]", error.message);
    return res.status(500).json({ error: "Erro ao buscar produtos." });
  }
});

// ── GET /api/products/:id ─────────────────────────────────────────────────────

router.get("/:id", async (req, res) => {
  try {
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) return validationError(res, parsed.error);

    const data = await getProductById(parsed.data);
    return res.status(200).json(data);
  } catch (error) {
    console.error("[GET /products/:id]", error.message);
    const status = error.message.includes("não encontrado") ? 404 : 500;
    return res.status(status).json({ error: error.message });
  }
});

// ── POST /api/products ────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const parsed = urlSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);

    const product = await addProductByUrl(parsed.data.url);
    return res.status(201).json({ message: "Produto adicionado com sucesso!", product });
  } catch (error) {
    console.error("[POST /products]", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ── POST /api/products/scrape ─────────────────────────────────────────────────

router.post("/scrape", async (req, res) => {
  try {
    const data = await runScraping();
    return res.status(200).json(data);
  } catch (error) {
    console.error("[POST /products/scrape]", error.message);
    return res.status(500).json({ error: "Erro ao executar scraping." });
  }
});

// ── POST /api/products/:id/scrape ─────────────────────────────────────────────

router.post("/:id/scrape", async (req, res) => {
  try {
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) return validationError(res, parsed.error);

    const data = await scrapeProductById(parsed.data);
    return res.status(200).json(data);
  } catch (error) {
    console.error("[POST /products/:id/scrape]", error.message);
    const status = error.message.includes("não encontrado") ? 404 : 500;
    return res.status(status).json({ error: error.message });
  }
});

// ── GET /api/products/:id/analyze ─────────────────────────────────────────────

router.get("/:id/analyze", async (req, res) => {
  try {
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) return validationError(res, parsed.error);

    const product = await findProductById(parsed.data);
    if (!product) return res.status(404).json({ error: "Produto não encontrado." });

    const history     = await findHistoryByProductId(parsed.data);
    const reviewTexts = (product.reviews || []).map((r) => r.texto);

    const [priceAnalysis, ratingAnalysis] = await Promise.all([
      analyzePriceTrend(product.titulo, history),
      analyzeRating(product.titulo, product.rating, reviewTexts),
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
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) return validationError(res, parsed.error);

    await deleteProduct(parsed.data);
    return res.status(200).json({ message: "Produto removido com sucesso." });
  } catch (error) {
    console.error("[DELETE /products/:id]", error.message);
    const status = error.message.includes("não encontrado") ? 404 : 500;
    return res.status(status).json({ error: error.message });
  }
});

module.exports = router;