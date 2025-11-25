import express, { Request, Response } from "express";
import { PORT, WEB_APP_URL } from "./config/env";
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

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.options("*", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS"
    );
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.sendStatus(200);
  });

  app.use(express.json());

  bot.launch();
  await checkIfBotIsAdmin();
  // await sendMessageToAllBotUsers(
  //   "We are back online! Start earning coins and making money again!"
  // );

  app.get("/", (req: Request, res: Response) => {
    res.json("Hey, you just got hacked!");
  });

  app.use("/api", apiRouter);

  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
}
