// src/repositories/productRepository.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Retorna produtos paginados com histórico e reviews
async function findAllProducts({ page = 1, limit = 20 } = {}) {
  const skip  = (page - 1) * limit;
  const total = await prisma.product.count();

  const products = await prisma.product.findMany({
    skip,
    take:    limit,
    orderBy: { createdAt: "desc" },
    include: {
      history: {
        orderBy: { createdAt: "desc" },
        take: 2,
      },
      // Inclui as reviews mais recentes
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  return {
    products,
    total,
    totalPages:  Math.ceil(total / limit),
    currentPage: page,
  };
}

// Retorna um produto com histórico completo e reviews
async function findProductById(id) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      history: {
        orderBy: { createdAt: "asc" },
      },
      // Inclui todas as reviews do produto
      reviews: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// Cria ou atualiza o produto pelo título
async function upsertProduct(data) {
  const existing = await prisma.product.findFirst({
    where: { titulo: data.titulo },
  });

  if (existing) {
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

// Salva os textos das reviews — apaga as antigas e insere as novas
// Assim evitamos duplicatas a cada scraping
async function upsertReviews(productId, reviewTexts) {
  if (!reviewTexts || reviewTexts.length === 0) return;

  // Remove reviews antigas do produto
  await prisma.review.deleteMany({
    where: { productId },
  });

  // Insere as novas reviews
  await prisma.review.createMany({
    data: reviewTexts.map((texto) => ({
      productId,
      texto,
    })),
  });
}

// Registra snapshot de preço em BRL
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
    where:   { productId },
    orderBy: { createdAt: "asc" },
  });
}

// Remove um produto e seu histórico e reviews
async function deleteProduct(id) {
  await prisma.review.deleteMany({ where: { productId: id } });
  await prisma.priceHistory.deleteMany({ where: { productId: id } });
  return prisma.product.delete({ where: { id } });
}

module.exports = {
  findAllProducts,
  findProductById,
  upsertProduct,
  upsertReviews,
  createPriceHistory,
  findHistoryByProductId,
  deleteProduct,
};