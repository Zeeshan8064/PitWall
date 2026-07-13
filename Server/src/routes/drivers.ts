import { Router } from "express";
import { getDrivers } from "../services";

const router = Router();

router.get("/:sessionKey/drivers", async (req, res) => {
  try {
    const sessionKey = Number(req.params.sessionKey);
    if (isNaN(sessionKey)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session key",
      });
    }
    const drivers = await getDrivers(sessionKey);

    res.json({
      success: true,
      drivers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch drivers",
    });
  }
});

export default router;
