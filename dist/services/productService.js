"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScraping = runScraping;
exports.scrapeProductById = scrapeProductById;
exports.addProductByUrl = addProductByUrl;
exports.getAllProducts = getAllProducts;
exports.getProductById = getProductById;
// src/services/productService.ts
const scrapingService_1 = require("./scrapingService");
const currencyService_1 = require("./currencyService");
const productRepository_1 = require("../repositories/productRepository");
async function runScraping() {
    const scrapedProducts = await (0, scrapingService_1.scrapeProducts)();
    if (!scrapedProducts.length) {
        throw new Error("Nenhum produto encontrado no scraping.");
    }
    const results = await Promise.all(scrapedProducts.map(async (product) => {
        const saved = await (0, productRepository_1.upsertProduct)({
            titulo: product.title,
            precoUSD: product.precoUSD,
            precoBRL: product.precoBRL,
            imagem: product.image,
            url: product.url,
            rating: product.rating,
            exchangeRate: product.exchangeRate,
        });
        if (product.reviewTexts && product.reviewTexts.length > 0) {
            await (0, productRepository_1.upsertReviews)(saved.id, product.reviewTexts);
        }
        await (0, productRepository_1.createPriceHistory)(saved.id, product.precoBRL);
        return saved;
    }));
    return {
        message: `${results.length} produto(s) processado(s) com sucesso.`,
        products: results,
    };
}
async function scrapeProductById(id) {
    const product = await (0, productRepository_1.findProductById)(id);
    if (!product)
        throw new Error(`Produto com id ${id} não encontrado.`);
    if (!product.url)
        throw new Error("Este produto não tem URL cadastrada para re-scraping.");
    const data = await (0, scrapingService_1.scrapeByUrl)(product.url);
    const { valueBRL, rate } = await (0, currencyService_1.convertUSDtoBRL)(data.priceUSD);
    const saved = await (0, productRepository_1.upsertProduct)({
        titulo: data.title || product.titulo,
        precoUSD: data.priceUSD,
        precoBRL: valueBRL,
        imagem: data.image || product.imagem,
        url: product.url,
        rating: data.rating || product.rating,
        exchangeRate: rate,
    });
    if (data.reviewTexts && data.reviewTexts.length > 0) {
        await (0, productRepository_1.upsertReviews)(saved.id, data.reviewTexts);
    }
    await (0, productRepository_1.createPriceHistory)(saved.id, valueBRL);
    return {
        message: "Produto atualizado com sucesso.",
        product: saved,
    };
}
async function addProductByUrl(url) {
    const data = await (0, scrapingService_1.scrapeByUrl)(url);
    if (!data.title || data.priceUSD <= 0) {
        throw new Error("Não foi possível extrair os dados do produto nesta URL.");
    }
    const { valueBRL, rate } = await (0, currencyService_1.convertUSDtoBRL)(data.priceUSD);
    const saved = await (0, productRepository_1.upsertProduct)({
        titulo: data.title,
        precoUSD: data.priceUSD,
        precoBRL: valueBRL,
        imagem: data.image,
        url: url,
        rating: data.rating,
        exchangeRate: rate,
    });
    if (data.reviewTexts && data.reviewTexts.length > 0) {
        await (0, productRepository_1.upsertReviews)(saved.id, data.reviewTexts);
    }
    await (0, productRepository_1.createPriceHistory)(saved.id, valueBRL);
    return saved;
}
async function getAllProducts({ page = 1, limit = 20 } = {}) {
    const data = await (0, productRepository_1.findAllProducts)({ page, limit });
    return {
        products: data.products,
        total: data.total,
        totalPages: data.totalPages,
        currentPage: data.currentPage,
    };
}
async function getProductById(id) {
    const product = await (0, productRepository_1.findProductById)(id);
    if (!product)
        throw new Error(`Produto com id ${id} não encontrado.`);
    return { product };
}
