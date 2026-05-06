"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScheduledScraping = runScheduledScraping;
// src/services/scheduler.ts
const node_cron_1 = __importDefault(require("node-cron"));
const productService_1 = require("./productService");
async function runScheduledScraping() {
    console.log(`[Scheduler] Iniciando rodada: ${new Date().toISOString()}`);
    try {
        const result = await (0, productService_1.runScraping)();
        console.log(`[Scheduler] Rodada concluída — ${result.products.length} produto(s) atualizados.`);
    }
    catch (err) {
        console.error("[Scheduler] Erro durante scraping automático:", err.message);
    }
}
const CRON_INTERVAL = process.env.CRON_INTERVAL || "0 */6 * * *";
node_cron_1.default.schedule(CRON_INTERVAL, () => {
    void runScheduledScraping();
});
console.log(`[Scheduler] Agendador ativo. Intervalo: "${CRON_INTERVAL}"`);
