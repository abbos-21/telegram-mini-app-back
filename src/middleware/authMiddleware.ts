import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "../prisma";
import { JWT_SECRET } from "../config/env";

interface AuthTokenPayload extends JwtPayload {
  id: number;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(
      token as string,
      JWT_SECRET
    ) as unknown as AuthTokenPayload;

    if (!decoded?.id) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token payload" });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    (req as any).user = user;

    next();
  } catch (err) {
    console.error("JWT verification error:", err);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}
