require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const roomHandler = require("./sockets/roomHandler");
const yjsHandler = require("./sockets/yjsHandler");
const roomsRouter = require("./routes/rooms");
const { rooms } = require("./sockets/roomStore");
const { flushAll, stopAutosave } = require("./sockets/persistence");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const authRouter = require("./routes/auth");
const pingHandler = require("./sockets/pingHandler");
const replayRouter = require("./routes/replay");
const chatTypingHandler = require("./sockets/chatTypingHandler");
const aiRouter = require("./routes/ai");

const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const joinRequestHandler = require("./sockets/joinRequestHandler");

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.use("/api/rooms", roomsRouter);
app.use("/api/rooms", replayRouter);
app.use("/api/auth", authRouter);
app.use("/api/ai", aiRouter);

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: FRONTEND_ORIGIN }, maxHttpBufferSize: 5e6 });
io.on("connection", (socket) => {
  roomHandler(io, socket);
  yjsHandler(io, socket);
  pingHandler(io, socket);
  joinRequestHandler(io, socket);
  chatTypingHandler(io, socket);
});

connectDB().then(() => {
  server.listen(PORT, () => console.log(`SyncSpace server listening on port ${PORT}`));
});

async function shutdown(signal) {
  console.log(`${signal} received — flushing rooms before exit...`);
  stopAutosave();
  await flushAll(rooms);
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));