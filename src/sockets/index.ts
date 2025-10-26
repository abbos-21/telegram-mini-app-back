import { Server } from "socket.io";
import { startCounterBroadcast } from "./counterLoop";

export function initSockets(io: Server): void {
  console.log("\n--- Initializing Socket.IO Handlers ---");

  startCounterBroadcast(io);

  console.log("--- All Socket.IO Handlers Initialized ---\n");
}
