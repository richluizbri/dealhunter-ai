// src/services/aiService.js
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper interno para chamar a IA com tratamento de erro seguro
async function generateJSON(prompt) {
  try {
    const response = await ai.models.generateContent({
      model:    "gemma-3-27b-it",
      contents: prompt,
    });
    const text  = response.text.trim();
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (error) {
    console.error("Erro na API de IA:", error?.message || error);
    if (
      error?.status === 403 ||
      error?.status === 429 ||
      error?.message?.includes("403") ||
      error?.message?.includes("429")
    ) {
      throw new Error("IA indisponível no momento. Tente novamente mais tarde.");
    }
    throw new Error("Não foi possível gerar análise agora.");
  }
}

// Analisa tendência de preços — nome alinhado com o controller
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

// Analisa sentimento do rating — recebe titulo, rating e reviewTexts separados
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