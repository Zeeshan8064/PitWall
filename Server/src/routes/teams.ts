import { Router } from "express";

import { getTeamDetail, getTeams } from "../services";

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
    console.error(error);

    // An unknown slug is a bad URL, not a server fault.
    const notFound =
      error instanceof Error && error.message.startsWith("No team matching");

    res.status(notFound ? 404 : 500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch team",
    });
  }
});

export default router;
