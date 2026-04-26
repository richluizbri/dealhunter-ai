// src/server.js
require("dotenv").config();
const express       = require("express");
const cors          = require("cors");
const http          = require("http");
const { Server }    = require("socket.io");
const productRoutes = require("./controllers/productController");

const app    = express();
const server = http.createServer(app); // cria servidor HTTP manual para o socket.io usar

// Configura o WebSocket — permite conexão do frontend na porta 3000
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());

// Disponibiliza o io para os controllers via app
app.set("io", io);

// Rotas
app.use("/api/products", productRoutes);

// Health check
app.get("/", (req, res) => res.json({ status: "DealHunter AI online 🚀" }));

// Evento de conexão do WebSocket
io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Usa server.listen em vez de app.listen para o socket.io funcionar
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});