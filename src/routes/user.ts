import express from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/authenticate";

const router = express.Router();

router.use(authenticate);

router.get("/me", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!dbUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!dbUser.currentHealth && dbUser.tempCoins) {
      const updatedUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          tempCoins: 0,
        },
      });

      return res.json({
        success: true,
        data: {
          user: updatedUser,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        user: dbUser,
      },
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
