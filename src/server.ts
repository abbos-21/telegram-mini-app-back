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

  app.set("trust proxy", true);

  app.use(cors());

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

  app.get("/ip", (req: Request, res: Response) => {
    res.json({
      "req.ip": req.ip,
      "req.ips": req.ips,
      "x-forwarded-for": req.headers["x-forwarded-for"],
      "cf-connecting-ip": req.headers["cf-connecting-ip"],
      remoteAddress: req.socket.remoteAddress,
    });
  });

  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
}
