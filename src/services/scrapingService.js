// src/services/scrapingService.js
const puppeteer            = require("puppeteer");
const { convertUSDtoBRL }  = require("./currencyService");

// [CORREÇÃO] Usa o singleton de socket em vez de receber io como parâmetro.
// Isso desacopla o service do controller e do scheduler.
const { getIO } = require("../socket");

const TARGET_URL = "https://fake-ecommerce-five.vercel.app/";

// Helper interno: emite via socket e loga no servidor ao mesmo tempo.
// O try/catch garante que uma falha no socket não quebre o scraping.
function emit(event, payload) {
  console.log(`[scraping] ${payload.message || event}`);
  try {
    getIO().emit(event, payload);
  } catch (e) {
    // Socket ainda não inicializado (ex: chamada direta em teste).
    // Silencia o erro — o log acima já registrou a mensagem.
    console.warn("[scraping] Socket indisponível, apenas log local.");
  }
}

// [CORREÇÃO] Removido o parâmetro io da assinatura.
// Quem chamava scrapeProducts(io) deve passar para scrapeProducts().
async function scrapeProducts() {
  emit("scraping:status", { step: "browser", message: "🌐 Abrindo navegador..." });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    );

    emit("scraping:status", { step: "navigating", message: "📡 Acessando o site alvo..." });

    await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 30000 });

    emit("scraping:status", { step: "extracting", message: "📦 Extraindo produtos..." });

    const rawProducts = await page.evaluate(() => {
      const cards = document.querySelectorAll("article.product-card");

      return Array.from(cards).map((card) => {
        // Título
        const title =
          card.querySelector("[class*='title']")?.innerText?.trim() || "";

        // Preço
        const priceRaw =
          card.querySelector("[class*='price']")?.innerText?.trim() || "0";
        const priceUSD = parseFloat(priceRaw.replace(/[^0-9.]/g, "")) || 0;

        // Imagem
        const image = card.querySelector("img")?.src || "";

        // URL absoluta
        const url = card.querySelector("a")?.href || "";

        // Rating — valor + contagem
        const ratingValue = card.querySelector(".rating-value")?.innerText?.trim() || "";
        const ratingCount = card.querySelector(".rating-count")?.innerText?.trim() || "";
        const rating = ratingValue ? `${ratingValue} ${ratingCount}`.trim() : null;

        // [3.2] Extrai textos das reviews disponíveis no card.
        // Filtro de 10 chars elimina ruído (botões, labels de 1 palavra).
        const reviewElements = card.querySelectorAll(".review-text, [class*='review']");
        const reviewTexts = Array.from(reviewElements)
          .map((el) => el.innerText?.trim())
          .filter((text) => text && text.length >= 10);

        return { title, priceUSD, image, url, rating, reviewTexts };
      });
    });

    // Filtra produtos inválidos
    const validProducts = rawProducts.filter((p) => p.title && p.priceUSD > 0);

    emit("scraping:status", { step: "converting", message: "💱 Convertendo USD → BRL..." });

    // Converte sequencialmente com delay para não sobrecarregar a API
    const productsWithBRL = [];
    for (const product of validProducts) {
      const { valueBRL, rate } = await convertUSDtoBRL(product.priceUSD);
      productsWithBRL.push({
        ...product,
        precoBRL:     valueBRL,
        precoUSD:     product.priceUSD,
        exchangeRate: rate,
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return productsWithBRL;

  } finally {
    // [CORREÇÃO] finally garante que o browser sempre fecha,
    // mesmo se page.evaluate() ou convertUSDtoBRL() lançar erro.
    await browser.close();
    emit("scraping:status", { step: "done", message: "✅ Scraping concluído." });
  }
}

module.exports = { scrapeProducts };