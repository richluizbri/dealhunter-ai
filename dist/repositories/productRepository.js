"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllProducts = findAllProducts;
exports.findProductById = findProductById;
exports.upsertProduct = upsertProduct;
exports.upsertReviews = upsertReviews;
exports.createPriceHistory = createPriceHistory;
exports.findHistoryByProductId = findHistoryByProductId;
exports.deleteProduct = deleteProduct;
// src/repositories/productRepository.ts
const prisma_1 = __importDefault(require("../lib/prisma"));
async function findAllProducts({ page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [total, products] = await Promise.all([
        prisma_1.default.product.count(),
        prisma_1.default.product.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                history: { orderBy: { createdAt: "desc" }, take: 2 },
                reviews: { orderBy: { createdAt: "desc" }, take: 5 },
            },
        }),
    ]);
    return {
        products,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
    };
}
async function findProductById(id) {
    return prisma_1.default.product.findUnique({
        where: { id },
        include: {
            history: { orderBy: { createdAt: "asc" } },
            reviews: { orderBy: { createdAt: "desc" } },
        },
    });
}
async function upsertProduct(data) {
    const existing = await prisma_1.default.product.findFirst({
        where: { titulo: data.titulo },
    });
    if (existing) {
        return prisma_1.default.product.update({
            where: { id: existing.id },
            data: {
                precoUSD: data.precoUSD,
                precoBRL: data.precoBRL,
                imagem: data.imagem,
                url: data.url,
                rating: data.rating,
                exchangeRate: data.exchangeRate,
            },
        });
    }
    return prisma_1.default.product.create({
        data: {
            titulo: data.titulo,
            precoUSD: data.precoUSD,
            precoBRL: data.precoBRL,
            imagem: data.imagem,
            url: data.url,
            rating: data.rating,
            exchangeRate: data.exchangeRate,
        },
    });
}
async function upsertReviews(productId, reviewTexts) {
    if (!reviewTexts || reviewTexts.length === 0)
        return;
    await prisma_1.default.review.deleteMany({ where: { productId } });
    await prisma_1.default.review.createMany({
        data: reviewTexts.map((texto) => ({ productId, texto })),
    });
}
async function createPriceHistory(productId, precoBRL) {
    return prisma_1.default.priceHistory.create({
        data: { productId, preco: precoBRL },
    });
}
async function findHistoryByProductId(productId) {
    return prisma_1.default.priceHistory.findMany({
        where: { productId },
        orderBy: { createdAt: "asc" },
    });
}
async function deleteProduct(id) {
    await prisma_1.default.review.deleteMany({ where: { productId: id } });
    await prisma_1.default.priceHistory.deleteMany({ where: { productId: id } });
    return prisma_1.default.product.delete({ where: { id } });
}
