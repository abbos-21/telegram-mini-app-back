import express, { NextFunction, Request, Response } from "express";
import { PORT } from "./config/env";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { bot } from "./bot";

import apiRouter from "./routes";
import {
  AuthenticatedSocket,
  socketAuthMiddleware,
} from "./middleware/socketAuth";
import { initSockets } from "./sockets";

export async function startServer() {
  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // io.use(socketAuthMiddleware);

  app.use(cors());
  app.use(express.json());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.io = io;
    next();
  });

  bot.launch();

  app.get("/", (req: Request, res: Response) => {
    res.json("Hey, you just got hacked!");
  });

  app.use("/api", apiRouter);

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(
      `🟢 WebSocket connected: ${socket.id}. User: ${socket.user?.username}`
    );

    socket.on("disconnect", () => {
      console.log(
        `🔴 WebSocket disconnected: ${socket.id}. User: ${socket.user?.username}`
      );
    });
  });

  initSockets(io);

  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
}
