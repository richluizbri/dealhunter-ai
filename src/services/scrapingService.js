
const puppeteer = require("puppeteer");
const { convertUSDtoBRL } = require("./currencyService");

const TARGET_URL = "https://fake-ecommerce-five.vercel.app/";

async function scrapeProducts(io) {
  // Notifica que o site está abrindo
  io?.emit("scraping:status", { step: "browser", message: "🌐 Abrindo navegador..." });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
  );

  // Notifica que está navegando no site
  io?.emit("scraping:status", { step: "navigating", message: "📡 Acessando o site alvo..." });

  await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 30000 });

  // Notifica que está extraindo os dados
  io?.emit("scraping:status", { step: "extracting", message: "📦 Extraindo produtos..." });

  const rawProducts = await page.evaluate(() => {
    const cards = document.querySelectorAll("article.product-card");

    return Array.from(cards).map((card) => {
      const title =
        card.querySelector("[class*='title']")?.innerText?.trim() || "";

      const priceRaw =
        card.querySelector("[class*='price']")?.innerText?.trim() || "0";
      const priceUSD = parseFloat(priceRaw.replace(/[^0-9.]/g, "")) || 0;

      const image = card.querySelector("img")?.src || "";
      const url   = card.querySelector("a")?.href || "";

      const ratingValue = card.querySelector(".rating-value")?.innerText?.trim() || "";
      const ratingCount = card.querySelector(".rating-count")?.innerText?.trim() || "";
      const rating = ratingValue ? `${ratingValue} ${ratingCount}`.trim() : null;

      return { title, priceUSD, image, url, rating };
    });
  });

  await browser.close();

  const validProducts = rawProducts.filter((p) => p.title && p.priceUSD > 0);

  // Notifica que está convertendo os preços
  io?.emit("scraping:status", { step: "converting", message: "💱 Convertendo USD → BRL..." });

  const productsWithBRL = await Promise.all(
    validProducts.map(async (product) => {
      const { valueBRL, rate } = await convertUSDtoBRL(product.priceUSD);
      return {
        ...product,
        precoBRL:     valueBRL,
        precoUSD:     product.priceUSD,
        exchangeRate: rate,
      };
    })
  );

  return productsWithBRL;
}

module.exports = { scrapeProducts };