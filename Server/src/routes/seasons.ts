import { Router } from "express";
import { getSeasonRaces } from "../services";

const router = Router();

router.get("/season/:year", async (req, res) => {
  try {
    const year = Number(req.params.year);

    if (isNaN(year)) {
      return res.status(400).json({
        success: false,
        message: "Invalid year",
      });
    }

    const races = await getSeasonRaces(year);

    res.json({
      success: true,
      races,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch races",
    });
  }
});

export default router;