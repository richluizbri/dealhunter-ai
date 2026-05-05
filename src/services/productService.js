// src/services/productService.js
const { scrapeProducts } = require("./scrapingService");
const {
  findAllProducts,
  findProductById,
  upsertProduct,
  createPriceHistory,
} = require("../repositories/productRepository");

async function runScraping() {
  const scrapedProducts = await scrapeProducts();

  if (!scrapedProducts.length) {
    throw new Error("Nenhum produto encontrado no scraping.");
  }

  const results = await Promise.all(
    scrapedProducts.map(async (product) => {
      const saved = await upsertProduct({
        titulo:       product.title,
        precoUSD:     product.precoUSD,
        precoBRL:     product.precoBRL,
        imagem:       product.image,
        url:          product.url,
        rating:       product.rating,
        exchangeRate: product.exchangeRate,
      });

      await createPriceHistory(saved.id, product.precoBRL);
      return saved;
    })
  );

  return {
    message:  `${results.length} produto(s) processado(s) com sucesso.`,
    products: results,
  };
}

async function getAllProducts({ page = 1, limit = 20 } = {}) {
  const data = await findAllProducts({ page, limit });
  return {
    products:    data.products,
    total:       data.total,
    totalPages:  data.totalPages,
    currentPage: data.currentPage,
  };
}

async function getProductById(id) {
  const product = await findProductById(Number(id));
  if (!product) {
    throw new Error(`Produto com id ${id} não encontrado.`);
  }
  return { product };
}

module.exports = { runScraping, getAllProducts, getProductById };