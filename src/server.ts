import express, { Request, Response } from "express";
import { PORT } from "./config/env";
import cors from "cors";
import http from "http";
import { bot } from "./bot";

import apiRouter from "./routes";
import {
  checkIfBotIsAdmin,
  sendMessageToAllBotUsers,
} from "./bot/helperFunctions";

export async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json());

  bot.launch();
  await checkIfBotIsAdmin();
  await sendMessageToAllBotUsers(
    "We are back online! Start earning coins and making money again!"
  );

  app.get("/", (req: Request, res: Response) => {
    res.json("Hey, you just got hacked!");
  });

  app.use("/api", apiRouter);

  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
}
