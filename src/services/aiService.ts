// src/services/aiService.ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemma-4-26b-a4b-it",
];

interface PricePoint {
  data:  string;
  preco: number;
}

interface PriceTrendResult {
  summary:        string;
  trend:          string;
  recommendation: string;
  insight:        string;
}

interface RatingResult {
  sentiment:   string;
  label:       string;
  description: string;
}

interface HistoryItem {
  preco:     number;
  createdAt: Date | string;
}

async function generateJSON<T>(prompt: string): Promise<T> {
  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const text  = response.text.trim();
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean) as T;

    } catch (error: any) {
      console.error(`[aiService] Falha com modelo ${model}:`, error?.message);
      lastError = error;

      const isTryNextError =
        error?.status === 403 ||
        error?.status === 429 ||
        error?.message?.includes("403") ||
        error?.message?.includes("429") ||
        error?.message?.includes("quota") ||
        error?.message?.includes("not found") ||
        error?.message?.includes("NOT_FOUND");

      if (!isTryNextError) break;
    }
  }

  console.error("[aiService] Todos os modelos falharam:", lastError?.message);
  throw new Error("IA indisponível no momento. Tente novamente mais tarde.");
}

async function analyzePriceTrend(titulo: string, history: HistoryItem[]): Promise<PriceTrendResult> {
  if (!history || history.length < 2) {
    return {
      summary:        "Histórico insuficiente para análise.",
      trend:          "stable",
      recommendation: "Aguarde mais coletas para gerar uma análise completa.",
      insight:        "Dispare novas coletas para acumular dados históricos.",
    };
  }

  const priceData: PricePoint[] = history.map((h) => ({
    data:  new Date(h.createdAt).toLocaleDateString("pt-BR"),
    preco: h.preco,
  }));

  const firstPrice = priceData[0].preco;
  const lastPrice  = priceData[priceData.length - 1].preco;
  const variation  = (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2);

  const prompt = `
Você é um analista de preços de e-commerce. Analise o histórico de preços abaixo.

Produto: ${titulo}
Preço atual: R$ ${lastPrice}
Preço inicial: R$ ${firstPrice}
Variação total: ${variation}%
Histórico: ${JSON.stringify(priceData)}

Responda APENAS em JSON puro sem markdown:
{
  "summary": "resumo em 1-2 frases em português",
  "trend": "up ou down ou stable",
  "recommendation": "recomendação de compra em 1 frase em português",
  "insight": "insight sobre o comportamento do preço em 1 frase"
}`;

  return generateJSON<PriceTrendResult>(prompt);
}

async function analyzeRating(titulo: string, rating: string | null, reviewTexts: string[] = []): Promise<RatingResult> {
  if (!rating) {
    return {
      sentiment:   "neutral",
      label:       "Sem avaliações",
      description: "Este produto ainda não possui avaliações registradas.",
    };
  }

  const reviewsBlock = reviewTexts.length > 0
    ? `\nAvaliações dos usuários:\n${reviewTexts.map((r, i) => `${i + 1}. "${r}"`).join("\n")}`
    : "";

  const prompt = `
Analise a avaliação deste produto de e-commerce.

Produto: ${titulo}
Avaliação: ${rating}${reviewsBlock}

Responda APENAS em JSON puro sem markdown:
{
  "sentiment": "positive ou neutral ou negative",
  "label": "rótulo curto em português",
  "description": "descrição em 1 frase em português"
}`;

  return generateJSON<RatingResult>(prompt);
}

export { analyzePriceTrend, analyzeRating };