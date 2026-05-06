"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUSDtoBRLRate = getUSDtoBRLRate;
exports.convertUSDtoBRL = convertUSDtoBRL;
const axios_1 = __importDefault(require("axios"));
let cachedRate = null;
let cacheTime = null;
const CACHE_TTL = 5 * 60 * 1000;
async function getUSDtoBRLRate() {
    if (cachedRate && cacheTime && (Date.now() - cacheTime) < CACHE_TTL) {
        return cachedRate;
    }
    try {
        const response = await axios_1.default.get("https://economia.awesomeapi.com.br/last/USD-BRL", { timeout: 5000 });
        cachedRate = parseFloat(response.data.USDBRL.bid);
    }
    catch {
        try {
            const response = await axios_1.default.get("https://open.er-api.com/v6/latest/USD", { timeout: 5000 });
            cachedRate = response.data.rates.BRL;
        }
        catch {
            cachedRate = 5.10;
        }
    }
    cacheTime = Date.now();
    return cachedRate;
}
async function convertUSDtoBRL(valueUSD) {
    const rate = await getUSDtoBRLRate();
    const valueBRL = parseFloat((valueUSD * rate).toFixed(2));
    return { valueBRL, rate };
}
