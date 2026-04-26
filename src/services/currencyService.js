
const axios = require("axios");

const AWESOME_API_URL = "https://economia.awesomeapi.com.br/last/USD-BRL";

async function getUSDtoBRLRate() {
  const response = await axios.get(AWESOME_API_URL);
  const rate = parseFloat(response.data.USDBRL.bid);
  return rate;
}

async function convertUSDtoBRL(valueUSD) {
  const rate = await getUSDtoBRLRate();
  const valueBRL = parseFloat((valueUSD * rate).toFixed(2));
  return { valueBRL, rate };
}

module.exports = { getUSDtoBRLRate, convertUSDtoBRL };