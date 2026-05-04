// src/repositories/productRepository.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Retorna produtos paginados com o último registro de histórico
async function findAllProducts({ page = 1, limit = 20 } = {}) {
  const skip  = (page - 1) * limit;
  const total = await prisma.product.count();

  const products = await prisma.product.findMany({
    skip,
    take:      limit,
    orderBy:   { createdAt: "desc" },
    include: {
      history: {
        orderBy: { createdAt: "desc" },
        take: 2,
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
    where: { productId },
    orderBy: { createdAt: "asc" },
  });
}

// Remove um produto e seu histórico
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