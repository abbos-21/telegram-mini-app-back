import { Request } from "express";

export const getRealIp = (req: Request) => {
  return req.ip || req.socket.remoteAddress || "unknown";
};
