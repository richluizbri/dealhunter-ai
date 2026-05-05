// src/lib/prisma.js
// Singleton do PrismaClient.
//
// Problema que isso resolve:
//   Se cada arquivo fizer `new PrismaClient()` individualmente,
//   o Node abre uma conexão separada por módulo. Em produção isso
//   esgota o pool de conexões do MySQL rapidamente.
//
// Solução:
//   Uma única instância criada aqui e exportada para todos os módulos.
//   O Node.js cacheia o require(), então esse arquivo roda só uma vez.

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development"
    // Em dev: loga queries, erros e warnings no console
    ? ["query", "error", "warn"]
    // Em produção: só erros — não polui os logs de infra
    : ["error"],
});

module.exports = prisma;