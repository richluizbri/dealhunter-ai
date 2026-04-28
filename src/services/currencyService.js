// src/services/currencyService.js
const axios = require("axios");

// Cache da cotação
let cachedRate = null;
let cacheTime  = null;
const CACHE_TTL = 5 * 60 * 1000;

async function getUSDtoBRLRate() {
  if (cachedRate && cacheTime && (Date.now() - cacheTime) < CACHE_TTL) {
    return cachedRate;
  }

  try {
    // Tenta a AwesomeAPI primeiro
    const response = await axios.get(
      "https://economia.awesomeapi.com.br/last/USD-BRL",
      { timeout: 5000 }
    );
    cachedRate = parseFloat(response.data.USDBRL.bid);
  } catch {
    try {
      // Fallback: Open Exchange Rates (gratuita, sem auth)
      const response = await axios.get(
        "https://open.er-api.com/v6/latest/USD",
        { timeout: 5000 }
      );
      cachedRate = response.data.rates.BRL;
    } catch {
      // Fallback final: cotação fixa
      cachedRate = 5.10;
    }
  }

  cacheTime = Date.now();
  return cachedRate;
}

async function convertUSDtoBRL(valueUSD) {
  const rate     = await getUSDtoBRLRate();
  const valueBRL = parseFloat((valueUSD * rate).toFixed(2));
  return { valueBRL, rate };
}

module.exports = { getUSDtoBRLRate, convertUSDtoBRL };