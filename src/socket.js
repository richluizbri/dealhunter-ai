// socket.js
// Singleton do Socket.io.
// Resolve o problema de passar io como parâmetro por toda a cadeia
// de funções (server → controller → service).
//
// Uso:
//   No server.js:           require("./socket").init(io)
//   Em qualquer service:    const { getIO } = require("./socket")
//                           getIO().emit("evento", dados)

let _io = null;

// Chamado uma única vez no server.js, logo após new Server()
function init(ioInstance) {
  _io = ioInstance;
}

// Chamado em qualquer service que precise emitir eventos.
// Lança erro claro se init() ainda não foi chamado — facilita debug.
function getIO() {
  if (!_io) {
    throw new Error("[socket.js] getIO() chamado antes de init(). Verifique a ordem de inicialização no server.js.");
  }
  return _io;
}

module.exports = { init, getIO };