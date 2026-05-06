// src/server.ts
import { execSync } from "child_process";

try {
  execSync("node node_modules/prisma/build/index.js generate", { stdio: "inherit" });
} catch (e: any) {
  console.log("Prisma generate skipped:", e.message);
}

import "dotenv/config";
import express        from "express";
import cors           from "cors";
import http           from "http";
import { Server }     from "socket.io";
import * as socketModule from "./socket";
import productRoutes  from "./controllers/productController";
import "./services/scheduler";

const app    = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const PORT         = process.env.PORT || 3001;

const io = new Server(server, {
  cors: {
    origin:  FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

socketModule.init(io);

app.use(cors({
  origin:  FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());

app.set("io", io);
app.use("/api/products", productRoutes);
app.get("/", (_req, res) => res.json({ status: "DealHunter AI online 🚀" }));

io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});