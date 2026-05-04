// src/services/productService.js
const { scrapeProducts }  = require("./scrapingService");
const {
  findAllProducts,
  findProductById,
  upsertProduct,
  createPriceHistory,
} = require("../repositories/productRepository");

// Dispara o scraping completo e persiste tudo no banco
async function runScraping(io) {
  io?.emit("scraping:status", { step: "start", message: "🔍 Iniciando coleta de dados..." });

  const scrapedProducts = await scrapeProducts(io);

  if (!scrapedProducts.length) {
    io?.emit("scraping:status", { step: "error", message: "❌ Nenhum produto encontrado." });
    throw new Error("Nenhum produto encontrado no scraping.");
  }

  io?.emit("scraping:status", { step: "saving", message: "💾 Salvando no banco de dados..." });

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

  io?.emit("scraping:status", {
    step:    "done",
    message: `✅ ${results.length} produto(s) coletado(s) com sucesso!`,
  });

  return {
    message:  `${results.length} produto(s) processado(s) com sucesso.`,
    products: results,
  };
}

// Retorna todos os produtos com paginação
async function getAllProducts({ page = 1, limit = 20 } = {}) {
  const data = await findAllProducts({ page, limit });

  return {
    products:    data.products,
    total:       data.total,
    totalPages:  data.totalPages,
    currentPage: data.currentPage,
  };
}

// Retorna um produto com histórico completo
async function getProductById(id) {
  const product = await findProductById(Number(id));

  if (!product) {
    throw new Error(`Produto com id ${id} não encontrado.`);
  }

  return { product };
}

module.exports = { runScraping, getAllProducts, getProductById };