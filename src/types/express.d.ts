import { Request, Response } from "express";
import { User } from "../generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      adminId?: number;
    }
  }
}
