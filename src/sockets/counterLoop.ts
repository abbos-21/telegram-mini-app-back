import { Server } from "socket.io";

const INCREMENT_INTERVAL_MS = 1000;
const EVENT_NAME = "counterUpdate";

let counter: number = 0;

export function startCounterBroadcast(io: Server): void {
  console.log("Counter loop started.");

  io.on("connection", (socket) => {
    console.log(`Client connected to counter: ${socket.id}`);

    socket.emit(EVENT_NAME, counter);

    socket.on("disconnect", () => {
      console.log(`Client disconnected from counter: ${socket.id}`);
    });
  });

  setInterval(() => {
    counter++;

    io.emit(EVENT_NAME, counter);
  }, INCREMENT_INTERVAL_MS);
}
