const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

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
    return prisma.product.update({
      where: { id: existing.id },
      data: {
        precoUSD: data.precoUSD,
        precoBRL: data.precoBRL,
        imagem:   data.imagem,
        url:      data.url,
        rating:   data.rating,
      },
    });
  }

  return prisma.product.create({
    data: {
      titulo:   data.titulo,
      precoUSD: data.precoUSD,
      precoBRL: data.precoBRL,
      imagem:   data.imagem,
      url:      data.url,
      rating:   data.rating,
    },
  });
}

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

module.exports = {
  findAllProducts,
  findProductById,
  upsertProduct,
  createPriceHistory,
  findHistoryByProductId,
};