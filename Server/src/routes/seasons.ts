import { Router } from "express";
import { getSeasonRaces } from "../services";

const router = Router();

router.get("/season/:year", async (req, res) => {
  try {
    const year = Number(req.params.year);

    if (isNaN(year)) {
      return res.status(400).json({
        success: false,
        message: "Invalid season year",
      });
    }

    const races = await getSeasonRaces(year);

    res.json({
      success: true,
      races,
    });
  } catch (error) {
    // Logged in full server-side; the response carries no internals. This
    // previously returned error.stack, which leaks file paths and structure
    // to anyone who can trigger a failure.
    console.error("Failed to fetch season:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch season",
    });
  }
});
export default router;