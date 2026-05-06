"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const child_process_1 = require("child_process");
try {
    (0, child_process_1.execSync)("node node_modules/prisma/build/index.js generate", { stdio: "inherit" });
}
catch (e) {
    console.log("Prisma generate skipped:", e.message);
}
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const socketModule = __importStar(require("./socket"));
const productController_1 = __importDefault(require("./controllers/productController"));
require("./services/scheduler");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const PORT = process.env.PORT || 3001;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST"],
    },
});
socketModule.init(io);
app.use((0, cors_1.default)({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express_1.default.json());
app.set("io", io);
app.use("/api/products", productController_1.default);
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
