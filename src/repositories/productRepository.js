
// src/repositories/productRepository.js

// [CORREÇÃO] Usa o singleton em vez de instanciar PrismaClient aqui.
// Isso garante uma única conexão compartilhada em toda a aplicação.
const prisma = require("../lib/prisma");

// Retorna produtos paginados com o último registro de histórico
async function findAllProducts({ page = 1, limit = 20 } = {}) {
  const skip  = (page - 1) * limit;

  // Executa count e findMany em paralelo — mais rápido que sequencial
  const [total, products] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({
      skip,
      take:    limit,
      orderBy: { createdAt: "desc" },
      include: {
        history: {
          orderBy: { createdAt: "desc" },
          take: 2,
        },
      },
    }),
  ]);

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

// [CORREÇÃO] Usa o upsert nativo do Prisma.
// Antes: findFirst + create/update manual (2 queries, não atômico).
// Agora: upsert (1 query atômica, sem risco de race condition).
// Só foi possível após adicionar @unique no campo titulo do schema.
async function upsertProduct(data) {
  return prisma.product.upsert({
    where: { titulo: data.titulo },
    // update: campos que mudam a cada scraping
    update: {
      precoUSD:     data.precoUSD,
      precoBRL:     data.precoBRL,
      imagem:       data.imagem,
      url:          data.url,
      rating:       data.rating,
      exchangeRate: data.exchangeRate,
    },
    // create: todos os campos, incluindo titulo (só na criação)
    create: {
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
    where:   { productId },
    orderBy: { createdAt: "asc" },
  });
}

// Remove um produto e seu histórico (cascata manual — schema não tem onDelete)
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