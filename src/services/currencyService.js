// src/services/currencyService.js
const axios = require("axios");

const AWESOME_API_URL = "https://economia.awesomeapi.com.br/last/USD-BRL";

// Cache da cotação para evitar múltiplas requisições
let cachedRate = null;
let cacheTime  = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getUSDtoBRLRate() {
  // Usa o cache se ainda for válido
  if (cachedRate && cacheTime && (Date.now() - cacheTime) < CACHE_TTL) {
    return cachedRate;
  }

  const response = await axios.get(AWESOME_API_URL);
  cachedRate = parseFloat(response.data.USDBRL.bid);
  cacheTime  = Date.now();
  return cachedRate;
}

async function convertUSDtoBRL(valueUSD) {
  const rate     = await getUSDtoBRLRate();
  const valueBRL = parseFloat((valueUSD * rate).toFixed(2));
  return { valueBRL, rate };
}

module.exports = { getUSDtoBRLRate, convertUSDtoBRL };