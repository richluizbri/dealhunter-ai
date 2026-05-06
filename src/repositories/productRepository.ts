// src/repositories/productRepository.ts
import prisma from "../lib/prisma";

interface ProductData {
  titulo:       string;
  precoUSD:     number;
  precoBRL:     number;
  imagem:       string | null;
  url:          string | null;
  rating:       string | null;
  exchangeRate: number | null;
}

async function findAllProducts({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [total, products] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({
      skip,
      take:    limit,
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
    totalPages:  Math.ceil(total / limit),
    currentPage: page,
  };
}

async function findProductById(id: number) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      history: { orderBy: { createdAt: "asc" } },
      reviews: { orderBy: { createdAt: "desc" } },
    },
  });
}

async function upsertProduct(data: ProductData) {
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

async function upsertReviews(productId: number, reviewTexts: string[]) {
  if (!reviewTexts || reviewTexts.length === 0) return;
  await prisma.review.deleteMany({ where: { productId } });
  await prisma.review.createMany({
    data: reviewTexts.map((texto) => ({ productId, texto })),
  });
}

async function createPriceHistory(productId: number, precoBRL: number) {
  return prisma.priceHistory.create({
    data: { productId, preco: precoBRL },
  });
}

async function findHistoryByProductId(productId: number) {
  return prisma.priceHistory.findMany({
    where:   { productId },
    orderBy: { createdAt: "asc" },
  });
}

async function deleteProduct(id: number) {
  await prisma.review.deleteMany({ where: { productId: id } });
  await prisma.priceHistory.deleteMany({ where: { productId: id } });
  return prisma.product.delete({ where: { id } });
}

export {
  findAllProducts,
  findProductById,
  upsertProduct,
  upsertReviews,
  createPriceHistory,
  findHistoryByProductId,
  deleteProduct,
};