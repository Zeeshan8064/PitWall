import { Router } from "express";
import { getSeasonRaces } from "../services";

const router = Router();

router.get("/season/:year", async (req, res) => {
  try {
    const year = Number(req.params.year);

    const races = await getSeasonRaces(year);

    res.json({
      success: true,
      races,
    });
  } catch (error) {
    console.error("FULL ERROR:", error);

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});
export default router;