// src/services/productService.js
const { scrapeProducts }  = require("./scrapingService");
const puppeteer           = require("puppeteer");
const { convertUSDtoBRL } = require("./currencyService");
const {
  findAllProducts,
  findProductById,
  upsertProduct,
  upsertReviews,
  createPriceHistory,
} = require("../repositories/productRepository");

// Dispara o scraping completo e persiste tudo no banco
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
    message:  `${results.length} produto(s) processado(s) com sucesso.`,
    products: results,
  };
}

// 4.2 — Adiciona produto manualmente por URL
async function addProductByUrl(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const productData = await page.evaluate(() => {
      const title =
        document.querySelector("[class*='title'], h1")?.innerText?.trim() || "";
      const priceRaw =
        document.querySelector("[class*='price']")?.innerText?.trim() || "0";
      const priceUSD = parseFloat(priceRaw.replace(/[^0-9.]/g, "")) || 0;
      const image    = document.querySelector("img")?.src || "";
      const ratingValue = document.querySelector(".rating-value")?.innerText?.trim() || "";
      const ratingCount = document.querySelector(".rating-count")?.innerText?.trim() || "";
      const rating = ratingValue ? `${ratingValue} ${ratingCount}`.trim() : null;
      const reviewElements = document.querySelectorAll(".review-text, [class*='review']");
      const reviewTexts = Array.from(reviewElements)
        .map((el) => el.innerText?.trim())
        .filter(Boolean);

      return { title, priceUSD, image, rating, reviewTexts };
    });

    if (!productData.title || productData.priceUSD <= 0) {
      throw new Error("Não foi possível extrair os dados do produto nesta URL.");
    }

    const { valueBRL, rate } = await convertUSDtoBRL(productData.priceUSD);

    const saved = await upsertProduct({
      titulo:       productData.title,
      precoUSD:     productData.priceUSD,
      precoBRL:     valueBRL,
      imagem:       productData.image,
      url:          url,
      rating:       productData.rating,
      exchangeRate: rate,
    });

    if (productData.reviewTexts && productData.reviewTexts.length > 0) {
      await upsertReviews(saved.id, productData.reviewTexts);
    }

    await createPriceHistory(saved.id, valueBRL);
    return saved;

  } finally {
    await browser.close();
  }
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

// Retorna um produto com histórico completo e reviews
async function getProductById(id) {
  const product = await findProductById(Number(id));
  if (!product) {
    throw new Error(`Produto com id ${id} não encontrado.`);
  }
  return { product };
}

module.exports = { runScraping, addProductByUrl, getAllProducts, getProductById };