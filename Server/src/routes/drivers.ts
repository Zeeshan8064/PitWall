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

    // ?season=2025 for one season, ?season=career for every ingested season.
    // Omitted defaults to the current season.
    const requested = req.query.season;

    let year: number | null | undefined = undefined;

    if (requested === "career") {
      year = null;
    } else if (requested !== undefined) {
      year = Number(requested);

      if (isNaN(year)) {
        return res.status(400).json({
          success: false,
          message: "Invalid season — expected a year or 'career'",
        });
      }
    }

    const { season, availableSeasons, stats, championship, timeline } =
      year === undefined
        ? await getDriverSeasonStats(driverNumber)
        : await getDriverSeasonStats(driverNumber, year);

    res.json({
      success: true,
      driverNumber,
      season,
      availableSeasons,
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
