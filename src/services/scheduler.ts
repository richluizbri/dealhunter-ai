// src/services/scheduler.ts
import cron from "node-cron";
import { runScraping } from "./productService";

async function runScheduledScraping(): Promise<void> {
  console.log(`[Scheduler] Iniciando rodada: ${new Date().toISOString()}`);
  try {
    const result = await runScraping();
    console.log(`[Scheduler] Rodada concluída — ${result.products.length} produto(s) atualizados.`);
  } catch (err: any) {
    console.error("[Scheduler] Erro durante scraping automático:", err.message);
  }
}

const CRON_INTERVAL = process.env.CRON_INTERVAL || "0 */6 * * *";

cron.schedule(CRON_INTERVAL, () => {
  void runScheduledScraping();
});

console.log(`[Scheduler] Agendador ativo. Intervalo: "${CRON_INTERVAL}"`);

export { runScheduledScraping };