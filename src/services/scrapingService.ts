// src/services/scrapingService.ts
import puppeteer from "puppeteer";
import { convertUSDtoBRL } from "./currencyService";
import { getIO } from "../socket";

const TARGET_URL = "https://fake-ecommerce-five.vercel.app/";

interface RawProduct {
  title:       string;
  priceUSD:    number;
  image:       string;
  url:         string;
  rating:      string | null;
  reviewTexts: string[];
}

interface ProcessedProduct extends RawProduct {
  precoBRL:    number;
  precoUSD:    number;
  exchangeRate: number;
}

function emit(event: string, payload: { step: string; message: string }): void {
  console.log(`[scraping] ${payload.message}`);
  try {
    getIO().emit(event, payload);
  } catch {
    console.warn("[scraping] Socket indisponível, apenas log local.");
  }
}

async function openBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
  );
  return { browser, page };
}

async function scrapeProducts(): Promise<ProcessedProduct[]> {
  emit("scraping:status", { step: "browser",     message: "🌐 Abrindo navegador..." });

  const { browser, page } = await openBrowser();

  try {
    emit("scraping:status", { step: "navigating", message: "📡 Acessando o site alvo..." });
    await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 30000 });

    emit("scraping:status", { step: "extracting", message: "📦 Extraindo produtos..." });

    const rawProducts: RawProduct[] = await page.evaluate(() => {
      const cards = document.querySelectorAll("article.product-card");
      return Array.from(cards).map((card) => {
        const title    = card.querySelector("[class*='title']")?.textContent?.trim() || "";
        const priceRaw = card.querySelector("[class*='price']")?.textContent?.trim() || "0";
        const priceUSD = parseFloat(priceRaw.replace(/[^0-9.]/g, "")) || 0;
        const image    = (card.querySelector("img") as HTMLImageElement)?.src || "";
        const url      = (card.querySelector("a") as HTMLAnchorElement)?.href || "";
        const ratingValue = card.querySelector(".rating-value")?.textContent?.trim() || "";
        const ratingCount = card.querySelector(".rating-count")?.textContent?.trim() || "";
        const rating   = ratingValue ? `${ratingValue} ${ratingCount}`.trim() : null;
        const reviewElements = card.querySelectorAll(".review-text, [class*='review']");
        const reviewTexts = Array.from(reviewElements)
          .map((el) => el.textContent?.trim() || "")
        .filter((text) =>
        text.length >= 15 &&
        !text.toLowerCase().includes("write a review") &&
        !text.toLowerCase().includes("verified purchase") &&
        !/^\d+$/.test(text) &&
        !/^\d+\/\d+$/.test(text)
      );
        return { title, priceUSD, image, url, rating, reviewTexts };
      });
    });

    const validProducts = rawProducts.filter((p) => p.title && p.priceUSD > 0);

    emit("scraping:status", { step: "converting", message: "💱 Convertendo USD → BRL..." });

    const productsWithBRL: ProcessedProduct[] = [];
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

    emit("scraping:status", { step: "done", message: "✅ Scraping concluído." });
    return productsWithBRL;

  } finally {
    await browser.close();
  }
}

async function scrapeByUrl(url: string): Promise<RawProduct> {
  emit("scraping:status", { step: "browser",     message: "🌐 Abrindo navegador..." });

  const { browser, page } = await openBrowser();

  try {
    emit("scraping:status", { step: "navigating", message: "📡 Acessando produto..." });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    emit("scraping:status", { step: "extracting", message: "📦 Extraindo dados do produto..." });

    const data: RawProduct = await page.evaluate(() => {
      const title    = document.querySelector("[class*='title'], h1")?.textContent?.trim() || "";
      const priceRaw = document.querySelector("[class*='price']")?.textContent?.trim() || "0";
      const priceUSD = parseFloat(priceRaw.replace(/[^0-9.]/g, "")) || 0;
      const image    = (document.querySelector("img") as HTMLImageElement)?.src || "";
      const ratingValue = document.querySelector(".rating-value")?.textContent?.trim() || "";
      const ratingCount = document.querySelector(".rating-count")?.textContent?.trim() || "";
      const rating   = ratingValue ? `${ratingValue} ${ratingCount}`.trim() : null;
      const reviewElements = document.querySelectorAll(".review-text, [class*='review']");
      const reviewTexts = Array.from(reviewElements)
        .map((el) => el.textContent?.trim() || "")
        .filter((text) => text.length >= 10);
      return { title, priceUSD, image, url: window.location.href, rating, reviewTexts };
    });

    emit("scraping:status", { step: "done", message: "✅ Produto coletado." });
    return data;

  } finally {
    await browser.close();
  }
}

export { scrapeProducts, scrapeByUrl };