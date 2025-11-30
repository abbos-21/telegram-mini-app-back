import express from "express";
import authRouter from "./auth";
import gameRouter from "./game";
import userRouter from "./user";
import rewardRouter from "./reward";
import upgradesRouter from "./upgrades";
import withdrawalsRouter from "./withdrawals";
import taskRouter from "./task";
import adminRouter from "./admin";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/game", gameRouter);
router.use("/user", userRouter);
router.use("/reward", rewardRouter);
router.use("/upgrades", upgradesRouter);
router.use("/withdrawals", withdrawalsRouter);
router.use("/task", taskRouter);
router.use("/admin", adminRouter);

export default router;
