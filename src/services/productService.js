// src/services/productService.js
const { scrapeProducts }  = require("./scrapingService");
const {
  findAllProducts,
  findProductById,
  upsertProduct,
  createPriceHistory,
} = require("../repositories/productRepository");

// Dispara o scraping completo e persiste tudo no banco
// io = instância do socket.io para emitir eventos em tempo real
async function runScraping(io) {
  // Notifica o frontend que o scraping começou
  io?.emit("scraping:status", { step: "start", message: "🔍 Iniciando coleta de dados..." });

  const scrapedProducts = await scrapeProducts(io);

  if (!scrapedProducts.length) {
    io?.emit("scraping:status", { step: "error", message: "❌ Nenhum produto encontrado." });
    throw new Error("Nenhum produto encontrado no scraping.");
  }

  // Notifica que está salvando no banco
  io?.emit("scraping:status", { step: "saving", message: "💾 Salvando no banco de dados..." });

  const results = await Promise.all(
    scrapedProducts.map(async (product) => {
      const saved = await upsertProduct({
        titulo:   product.title,
        precoUSD: product.precoUSD,
        precoBRL: product.precoBRL,
        imagem:   product.image,
        url:      product.url,
        rating:   product.rating,
      });

      await createPriceHistory(saved.id, product.precoBRL);
      return saved;
    })
  );

  // Notifica que finalizou com sucesso
  io?.emit("scraping:status", {
    step: "done",
    message: `✅ ${results.length} produto(s) coletado(s) com sucesso!`,
  });

  return {
    message: `${results.length} produto(s) processado(s) com sucesso.`,
    products: results,
  };
}

// Retorna todos os produtos para a listagem
async function getAllProducts() {
  const products = await findAllProducts();

  if (!products.length) {
    return { message: "Nenhum produto cadastrado ainda.", products: [] };
  }

  return { products };
}

// Retorna um produto com histórico completo para a tela de detalhes
async function getProductById(id) {
  const product = await findProductById(Number(id));

  if (!product) {
    throw new Error(`Produto com id ${id} não encontrado.`);
  }

  return { product };
}

module.exports = { runScraping, getAllProducts, getProductById };