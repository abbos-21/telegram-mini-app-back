import { Socket } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "../prisma";
import { JWT_SECRET } from "../config/env";
import { User } from "../../generated/prisma/client";

interface AuthTokenPayload extends JwtPayload {
  id: number;
}

export interface AuthenticatedSocket extends Socket {
  user?: User;
}

export async function socketAuthMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    const decoded = jwt.verify(token as string, JWT_SECRET) as AuthTokenPayload;

    if (!decoded?.id) {
      return next(new Error("Authentication error: Invalid token payload"));
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    socket.user = user;

    next();
  } catch (err) {
    console.error("Socket JWT verification error:", err);
    next(new Error("Authentication error: Invalid token"));
  }
}
