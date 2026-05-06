"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
exports.getIO = getIO;
let _io = null;
function init(ioInstance) {
    _io = ioInstance;
}
function getIO() {
    if (!_io) {
        throw new Error("[socket.ts] getIO() chamado antes de init(). Verifique a ordem de inicialização no server.ts.");
    }
    return _io;
}
