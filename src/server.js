// server.js
const { execSync } = require("child_process");
try { execSync("node node_modules/prisma/build/index.js generate", { stdio: "inherit" }); } catch(e) { console.log("Prisma generate skipped:", e.message); }
try { execSync("node_modules/.bin/prisma generate", { stdio: "inherit" }); } catch(e) {}

require("dotenv").config();

const express       = require("express");
const cors          = require("cors");
const http          = require("http");
const { Server }    = require("socket.io");
const productRoutes = require("./controllers/productController");

// Importa o módulo de socket ANTES do scheduler.
// O socket.js exporta { init, getIO } — init() precisa ser chamado
// aqui, logo após criar o server, para que getIO() funcione em
// qualquer service sem precisar passar io como parâmetro.
const socketModule  = require("./socket");

const app    = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// A partir daqui, qualquer arquivo pode fazer:
//   const { getIO } = require("./socket");
//   getIO().emit("evento", dados);
// sem precisar receber io como parâmetro de função.
socketModule.init(io);

// [CORREÇÃO] Scheduler importado DEPOIS do socketModule.init()
// para garantir que getIO() já esteja disponível quando o cron rodar.
require("./services/scheduler");

const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());

// Mantido para compatibilidade com controllers que leem req.app.get("io").
app.set("io", io);

app.use("/api/products", productRoutes);

app.get("/", (req, res) => res.json({ status: "DealHunter AI online 🚀" }));

io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando em http://localhost:${3000}`);
});