"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/controllers/productController.ts
const express_1 = require("express");
const zod_1 = require("zod");
const productService_1 = require("../services/productService");
const aiService_1 = require("../services/aiService");
const productRepository_1 = require("../repositories/productRepository");
const router = (0, express_1.Router)();
// ── Schemas de validação ──────────────────────────────────────────────────────
const idSchema = zod_1.z.coerce.number().int().positive({ message: "ID deve ser um número inteiro positivo." });
const paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
const urlSchema = zod_1.z.object({
    url: zod_1.z.string().url({ message: "URL inválida. Forneça uma URL completa com http:// ou https://" }),
});
// ── Helper ────────────────────────────────────────────────────────────────────
function validationError(res, error) {
    const message = error.issues?.[0]?.message || "Dados inválidos.";
    return res.status(400).json({ error: message });
}
// ── GET /api/products ─────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const parsed = paginationSchema.safeParse(req.query);
        if (!parsed.success)
            return validationError(res, parsed.error);
        const { page, limit } = parsed.data;
        const data = await (0, productService_1.getAllProducts)({ page, limit });
        return res.status(200).json(data);
    }
    catch (error) {
        console.error("[GET /products]", error.message);
        return res.status(500).json({ error: "Erro ao buscar produtos." });
    }
});
// ── GET /api/products/:id ─────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
    try {
        const parsed = idSchema.safeParse(req.params.id);
        if (!parsed.success)
            return validationError(res, parsed.error);
        const data = await (0, productService_1.getProductById)(parsed.data);
        return res.status(200).json(data);
    }
    catch (error) {
        console.error("[GET /products/:id]", error.message);
        const status = error.message.includes("não encontrado") ? 404 : 500;
        return res.status(status).json({ error: error.message });
    }
});
// ── POST /api/products ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
    try {
        const parsed = urlSchema.safeParse(req.body);
        if (!parsed.success)
            return validationError(res, parsed.error);
        const product = await (0, productService_1.addProductByUrl)(parsed.data.url);
        return res.status(201).json({ message: "Produto adicionado com sucesso!", product });
    }
    catch (error) {
        console.error("[POST /products]", error.message);
        return res.status(500).json({ error: error.message });
    }
});
// ── POST /api/products/scrape ─────────────────────────────────────────────────
router.post("/scrape", async (req, res) => {
    try {
        const data = await (0, productService_1.runScraping)();
        return res.status(200).json(data);
    }
    catch (error) {
        console.error("[POST /products/scrape]", error.message);
        return res.status(500).json({ error: "Erro ao executar scraping." });
    }
});
// ── POST /api/products/:id/scrape ─────────────────────────────────────────────
router.post("/:id/scrape", async (req, res) => {
    try {
        const parsed = idSchema.safeParse(req.params.id);
        if (!parsed.success)
            return validationError(res, parsed.error);
        const data = await (0, productService_1.scrapeProductById)(parsed.data);
        return res.status(200).json(data);
    }
    catch (error) {
        console.error("[POST /products/:id/scrape]", error.message);
        const status = error.message.includes("não encontrado") ? 404 : 500;
        return res.status(status).json({ error: error.message });
    }
});
// ── GET /api/products/:id/analyze ─────────────────────────────────────────────
router.get("/:id/analyze", async (req, res) => {
    try {
        const parsed = idSchema.safeParse(req.params.id);
        if (!parsed.success)
            return validationError(res, parsed.error);
        const product = await (0, productRepository_1.findProductById)(parsed.data);
        if (!product)
            return res.status(404).json({ error: "Produto não encontrado." });
        const history = await (0, productRepository_1.findHistoryByProductId)(parsed.data);
        const reviewTexts = (product.reviews || []).map((r) => r.texto);
        const [priceAnalysis, ratingAnalysis] = await Promise.all([
            (0, aiService_1.analyzePriceTrend)(product.titulo, history),
            (0, aiService_1.analyzeRating)(product.titulo, product.rating, reviewTexts),
        ]);
        return res.status(200).json({ priceAnalysis, ratingAnalysis });
    }
    catch (error) {
        console.error("[GET /products/:id/analyze]", error.message);
        return res.status(500).json({ error: "Erro ao analisar produto." });
    }
});
// ── DELETE /api/products/:id ──────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
    try {
        const parsed = idSchema.safeParse(req.params.id);
        if (!parsed.success)
            return validationError(res, parsed.error);
        await (0, productRepository_1.deleteProduct)(parsed.data);
        return res.status(200).json({ message: "Produto removido com sucesso." });
    }
    catch (error) {
        console.error("[DELETE /products/:id]", error.message);
        const status = error.message.includes("não encontrado") ? 404 : 500;
        return res.status(status).json({ error: error.message });
    }
});
exports.default = router;
