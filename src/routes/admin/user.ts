import express, { Request, Response } from "express";
import prisma from "../../prisma";
import { requireAdmin } from "../../middleware/admin-auth";

const router = express.Router();

router.get("/total", requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();

    const total = users.length;
    return res.status(200).json({
      success: true,
      data: total,
    });
  } catch (error) {
    console.error("Error fetching total number of users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/all", requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching all users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    if (!isNaN(Number(userId))) {
      const id = Number(userId);
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "There is no use with this id" });

      return res.status(200).json({
        success: true,
        data: user,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "The user ID is not numeric",
      });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
