
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateJSON(prompt) {
  const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
    contents: prompt,
  });
  const text  = response.text.trim();
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
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
async function analyzeRating(product) {
  if (!product.rating) {
    return {
      sentiment:   "neutral",
      label:       "Sem avaliações",
      description: "Este produto ainda não possui avaliações registradas.",
    };
  }

  const prompt = `
Analise a avaliação deste produto de e-commerce.

Produto: ${product.titulo}
Avaliação: ${product.rating}

Responda APENAS em JSON puro sem markdown:
{
  "sentiment": "positive ou neutral ou negative",
  "label": "rótulo curto em português",
  "description": "descrição em 1 frase em português"
}`;

  return generateJSON(prompt);
}

module.exports = { analyzePriceHistory, analyzeRating };