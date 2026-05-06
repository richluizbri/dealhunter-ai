import { Server } from "socket.io";

let _io: Server | null = null;

export function init(ioInstance: Server): void {
  _io = ioInstance;
}

export function getIO(): Server {
  if (!_io) {
    throw new Error("[socket.ts] getIO() chamado antes de init(). Verifique a ordem de inicialização no server.ts.");
  }
  return _io;
}