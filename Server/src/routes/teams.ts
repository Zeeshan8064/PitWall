import { Router } from "express";

import { getTeamDetail, getTeams } from "../services";
import { describeError } from "../utils/httpError";

const DEFAULT_SEASON = 2026;

const router = Router();

router.get("/teams", async (req, res) => {
  try {
    // Unscoped returns every constructor ever ingested; callers showing a
    // current grid should pass ?season=.
    const season =
      req.query.season !== undefined ? Number(req.query.season) : undefined;

    if (season !== undefined && isNaN(season)) {
      return res.status(400).json({
        success: false,
        message: "Invalid season",
      });
    }

    const teams = await getTeams(season);

    res.json({
      success: true,
      teams,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch teams",
    });
  }
});

router.get("/teams/:slug", async (req, res) => {
  try {
    const season =
      req.query.season !== undefined
        ? Number(req.query.season)
        : DEFAULT_SEASON;

    if (isNaN(season)) {
      return res.status(400).json({
        success: false,
        message: "Invalid season",
      });
    }

    const detail = await getTeamDetail(req.params.slug, season);

    res.json({
      success: true,
      ...detail,
    });
  } catch (error) {
    console.error("Failed to fetch team:", error);

    // An unknown slug is a bad URL, not a server fault.
    const { status, message } = describeError(error, "Failed to fetch team");

    res.status(status).json({ success: false, message });
  }
});

export default router;
