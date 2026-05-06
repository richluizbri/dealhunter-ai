import axios from "axios";

let cachedRate: number | null = null;
let cacheTime: number | null  = null;
const CACHE_TTL = 5 * 60 * 1000;

async function getUSDtoBRLRate(): Promise<number> {
  if (cachedRate && cacheTime && (Date.now() - cacheTime) < CACHE_TTL) {
    return cachedRate;
  }

  try {
    const response = await axios.get(
      "https://economia.awesomeapi.com.br/last/USD-BRL",
      { timeout: 5000 }
    );
    cachedRate = parseFloat(response.data.USDBRL.bid);
  } catch {
    try {
      const response = await axios.get(
        "https://open.er-api.com/v6/latest/USD",
        { timeout: 5000 }
      );
      cachedRate = response.data.rates.BRL;
    } catch {
      cachedRate = 5.10;
    }
  }

  cacheTime = Date.now();
  return cachedRate as number;
}

async function convertUSDtoBRL(valueUSD: number): Promise<{ valueBRL: number; rate: number }> {
  const rate     = await getUSDtoBRLRate();
  const valueBRL = parseFloat((valueUSD * rate).toFixed(2));
  return { valueBRL, rate };
}

export { getUSDtoBRLRate, convertUSDtoBRL };