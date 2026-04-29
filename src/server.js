const { execSync } = require("child_process");
try { execSync("node_modules/.bin/prisma generate", { stdio: "inherit" }); } catch(e) {}

require("dotenv").config();
const express       = require("express");
const cors          = require("cors");
const http          = require("http");
const { Server }    = require("socket.io");
const productRoutes = require("./controllers/productController");

const app    = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());

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
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});