import { Router } from "express";
import { getLaps } from "../services";

const router = Router();
router.get("/:sessionKey/laps", async (req, res) => {
  try {
    const sessionKey = Number(req.params.sessionKey);
    if (isNaN(sessionKey)) {
  return res.status(400).json({
    success: false,
    message: "Invalid session key",
  });
}
    const laps = await getLaps(sessionKey);

    res.json({
      success: true,
      laps,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch laps",
    });
  }
});

export default router;
