const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Modelos em ordem de preferência — tenta o próximo se o atual falhar
const MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemma-4-26b-a4b-it",
];

// Helper interno — tenta cada modelo até um funcionar
async function generateJSON(prompt) {
  let lastError;

  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const text  = response.text.trim();
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);

    } catch (error) {
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

// Analisa tendência de preços
async function analyzePriceTrend(titulo, history) {
  if (!history || history.length < 2) {
    return {
      summary:        "Histórico insuficiente para análise.",
      trend:          "stable",
      recommendation: "Aguarde mais coletas para gerar uma análise completa.",
      insight:        "Dispare novas coletas para acumular dados históricos.",
    };
  }

  const priceData  = history.map((h) => ({
    data:  new Date(h.createdAt).toLocaleDateString("pt-BR"),
    preco: h.preco,
  }));
  const firstPrice = priceData[0].preco;
  const lastPrice  = priceData[priceData.length - 1].preco;
  const variation  = ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2);

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

  return generateJSON(prompt);
}

// Analisa sentimento do rating e reviews
async function analyzeRating(titulo, rating, reviewTexts = []) {
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

  return generateJSON(prompt);
}

module.exports = { analyzePriceTrend, analyzeRating };