import { Server as SocketIOServer } from "socket.io";
import { Request, Response } from "express";
import { User } from "../generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      io?: SocketIOServer;
      user?: User;
    }
  }
}
