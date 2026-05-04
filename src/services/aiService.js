// src/services/aiService.js
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 2.10 — Troca para gemma-3-27b-it para evitar erro 429
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
    // 3.1 — Captura erros da API e loga apenas no servidor
    console.error("Erro na API de IA:", error?.message || error);

    // Retorna mensagem amigável para erros de cota ou permissão
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

// Analisa a variação de preços e retorna um resumo inteligente
async function analyzePriceHistory(product, history) {
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

Produto: ${product.titulo}
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

// Analisa o sentimento do rating do produto
// 3.2 — Aceita reviewTexts opcionalmente para análise mais rica
async function analyzeRating(product) {
  if (!product.rating) {
    return {
      sentiment:   "neutral",
      label:       "Sem avaliações",
      description: "Este produto ainda não possui avaliações registradas.",
    };
  }

  // 3.2 — Monta bloco de reviews se disponível
  const reviewsBlock = product.reviewTexts && product.reviewTexts.length > 0
    ? `\nAvaliações dos usuários:\n${product.reviewTexts.map((r, i) => `${i + 1}. "${r}"`).join("\n")}`
    : "";

  const prompt = `
Analise a avaliação deste produto de e-commerce.

Produto: ${product.titulo}
Avaliação: ${product.rating}${reviewsBlock}

Responda APENAS em JSON puro sem markdown:
{
  "sentiment": "positive ou neutral ou negative",
  "label": "rótulo curto em português",
  "description": "descrição em 1 frase em português"
}`;

  return generateJSON(prompt);
}

module.exports = { analyzePriceHistory, analyzeRating };