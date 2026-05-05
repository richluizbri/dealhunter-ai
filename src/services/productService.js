// src/services/productService.js
const { scrapeProducts, scrapeByUrl } = require("./scrapingService");
const { convertUSDtoBRL } = require("./currencyService");
const {
  findAllProducts,
  findProductById,
  upsertProduct,
  upsertReviews,
  createPriceHistory,
} = require("../repositories/productRepository");

// Atualiza TODOS os produtos monitorados
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

      if (product.reviewTexts && product.reviewTexts.length > 0) {
        await upsertReviews(saved.id, product.reviewTexts);
      }

      await createPriceHistory(saved.id, product.precoBRL);
      return saved;
    })
  );

  return {
    message:  `${results.length} produto(s) atualizado(s) com sucesso.`,
    products: results,
  };
}

// Re-scraping de UM produto específico pelo ID
async function scrapeProductById(id) {
  const product = await findProductById(id);
  if (!product) throw new Error(`Produto com id ${id} não encontrado.`);
  if (!product.url) throw new Error("Este produto não tem URL cadastrada para re-scraping.");

  const data = await scrapeByUrl(product.url);

  const { valueBRL, rate } = await convertUSDtoBRL(data.priceUSD);

  const saved = await upsertProduct({
    titulo:       data.title || product.titulo,
    precoUSD:     data.priceUSD,
    precoBRL:     valueBRL,
    imagem:       data.image || product.imagem,
    url:          product.url,
    rating:       data.rating || product.rating,
    exchangeRate: rate,
  });

  if (data.reviewTexts && data.reviewTexts.length > 0) {
    await upsertReviews(saved.id, data.reviewTexts);
  }

  await createPriceHistory(saved.id, valueBRL);

  return {
    message: "Produto atualizado com sucesso.",
    product: saved,
  };
}

// Adiciona produto manualmente por URL
async function addProductByUrl(url) {
  const data = await scrapeByUrl(url);

  if (!data.title || data.priceUSD <= 0) {
    throw new Error("Não foi possível extrair os dados do produto nesta URL.");
  }

  const { valueBRL, rate } = await convertUSDtoBRL(data.priceUSD);

  const saved = await upsertProduct({
    titulo:       data.title,
    precoUSD:     data.priceUSD,
    precoBRL:     valueBRL,
    imagem:       data.image,
    url:          url,
    rating:       data.rating,
    exchangeRate: rate,
  });

  if (data.reviewTexts && data.reviewTexts.length > 0) {
    await upsertReviews(saved.id, data.reviewTexts);
  }

  await createPriceHistory(saved.id, valueBRL);
  return saved;
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
  if (!product) throw new Error(`Produto com id ${id} não encontrado.`);
  return { product };
}

module.exports = { runScraping, scrapeProductById, addProductByUrl, getAllProducts, getProductById };