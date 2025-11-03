import express from "express";
import authRouter from "./auth";
import gameRouter from "./game";
import userRouter from "./user";
import rewardRouter from "./reward";
import upgradesRouter from "./upgrades";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/game", gameRouter);
router.use("/user", userRouter);
router.use("/reward", rewardRouter);
router.use("/upgrades", upgradesRouter);

export default router;
