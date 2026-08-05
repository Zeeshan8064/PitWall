import { Router } from "express";
import { getDrivers, getAllDrivers, DRIVERS_PAGE_SEASON, getDriverSeasonStats} from "../services";

const router = Router();
router.get("/drivers", async (req, res) => {
  try {
    // The full season grid, not the entry list of one race — a driver who only
    // appeared later in the season would otherwise be missing.
    const drivers = await getAllDrivers(DRIVERS_PAGE_SEASON);

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

    const { season, stats, championship, timeline } =
      await getDriverSeasonStats(driverNumber);

    res.json({
      success: true,
      driverNumber,
      season,
      stats,
      championship,
      timeline,
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
