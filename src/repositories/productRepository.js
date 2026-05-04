// src/repositories/productRepository.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ── PRODUCT ──────────────────────────────────────────────────────────────────

// Retorna todos os produtos com o último registro de histórico
async function findAllProducts() {
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      history: {
        orderBy: { createdAt: "desc" },
        take: 2,
      },
    },
  });
}

// Retorna um produto com histórico completo para o gráfico
async function findProductById(id) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      history: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

// Cria ou atualiza o produto pelo título — evita duplicatas
async function upsertProduct(data) {
  const existing = await prisma.product.findFirst({
    where: { titulo: data.titulo },
  });

  if (existing) {
    // Atualiza todos os campos incluindo exchangeRate
    return prisma.product.update({
      where: { id: existing.id },
      data: {
        precoUSD:     data.precoUSD,
        precoBRL:     data.precoBRL,
        imagem:       data.imagem,
        url:          data.url,
        rating:       data.rating,
        exchangeRate: data.exchangeRate,
      },
    });
  }

  // Cria novo produto com todos os campos
  return prisma.product.create({
    data: {
      titulo:       data.titulo,
      precoUSD:     data.precoUSD,
      precoBRL:     data.precoBRL,
      imagem:       data.imagem,
      url:          data.url,
      rating:       data.rating,
      exchangeRate: data.exchangeRate,
    },
  });
}

// ── PRICE HISTORY ─────────────────────────────────────────────────────────────

// Registra snapshot de preço em BRL — banco armazena SOMENTE BRL
async function createPriceHistory(productId, precoBRL) {
  return prisma.priceHistory.create({
    data: {
      productId,
      preco: precoBRL,
    },
  });
}

// Retorna todo o histórico de um produto
async function findHistoryByProductId(productId) {
  return prisma.priceHistory.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
  });
}

// Remove um produto e seu histórico do banco
async function deleteProduct(id) {
  await prisma.priceHistory.deleteMany({
    where: { productId: id },
  });
  return prisma.product.delete({
    where: { id },
  });
}

module.exports = {
  findAllProducts,
  findProductById,
  upsertProduct,
  createPriceHistory,
  findHistoryByProductId,
  deleteProduct,
};