// src/services/scheduler.js
// Melhoria 4.1: Agendamento automático de scraping com node-cron.
// Este módulo roda em background, disparando o scraper para todos
// os produtos cadastrados em intervalos regulares.

const cron = require("node-cron");
const { runScraping } = require("./productService");

// Função principal que roda o scraping completo da loja
async function runScheduledScraping() {
  console.log(`[Scheduler] Iniciando rodada: ${new Date().toISOString()}`);

  try {
    // Roda o scraping completo e salva/atualiza todos os produtos no banco
    // Passamos undefined no lugar do io pois não temos WebSocket no cron
    const result = await runScraping(undefined);
    console.log(`[Scheduler] Rodada concluída — ${result.products.length} produto(s) atualizados.`);
  } catch (err) {
    // Loga o erro mas NÃO deixa o scheduler parar de funcionar
    console.error("[Scheduler] Erro durante scraping automático:", err.message);
  }
}

// Sintaxe do cron: "0 */6 * * *" = a cada 6 horas, no minuto 0
// Para testar localmente, use "*/2 * * * *" (a cada 2 minutos)
// Referência: https://crontab.guru/
const CRON_INTERVAL = process.env.CRON_INTERVAL || "0 */6 * * *";

// Agenda a função para rodar no intervalo definido
cron.schedule(CRON_INTERVAL, () => {
  // void indica que não esperamos a Promise — o cron gerencia o agendamento
  void runScheduledScraping();
});

console.log(`[Scheduler] Agendador ativo. Intervalo: "${CRON_INTERVAL}"`);

module.exports = { runScheduledScraping };