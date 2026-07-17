import { Router } from "express";
import { getPositions } from "../services";

const router = Router();

router.get("/:sessionKey/positions", async (req, res) => {
  try {
    const sessionKey = Number(req.params.sessionKey);
    if (isNaN(sessionKey)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session key",
      });
    }
    const positions = await getPositions(sessionKey);

    res.json({
      success: true,
      positions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch positions",
    });
  }
});

export default router;