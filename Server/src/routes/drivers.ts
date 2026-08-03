import { Router } from "express";
import { getDrivers, getSeasonDriverSession, getDriverSeasonStats} from "../services";

const router = Router();
router.get("/drivers", async (req, res) => {
  try {
    const sessionKey = await getSeasonDriverSession(2026);
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

router.get("/drivers/:driverNumber", async (req, res) => {
  try {
    const driverNumber = Number(req.params.driverNumber);

    if (isNaN(driverNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver number",
      });
    }

    const stats = await getDriverSeasonStats(driverNumber);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch driver stats",
    });
  }
});

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
