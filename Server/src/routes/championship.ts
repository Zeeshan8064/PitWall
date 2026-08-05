import { Router } from "express";

import {
  getConstructorsChampionship,
  getConstructorsChampionshipAtRace,
  getDriverChampionship,
  getDriverChampionshipAtRace,
} from "../services";

const router = Router();

router.get("/championship/drivers/:year", async (req, res) => {
  try {
    const year = Number(req.params.year);

    if (isNaN(year)) {
      return res.status(400).json({
        success: false,
        message: "Invalid season year",
      });
    }

    const championship = await getDriverChampionship(year);

    res.json({
      success: true,
      ...championship,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch driver championship",
    });
  }
});

router.get("/championship/constructors/:year", async (req, res) => {
  try {
    const year = Number(req.params.year);

    if (isNaN(year)) {
      return res.status(400).json({
        success: false,
        message: "Invalid season year",
      });
    }

    const championship = await getConstructorsChampionship(year);

    res.json({
      success: true,
      ...championship,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch constructors championship",
    });
  }
});

router.get("/:sessionKey/championship/drivers", async (req, res) => {
  try {
    const sessionKey = Number(req.params.sessionKey);

    if (isNaN(sessionKey)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session key",
      });
    }

    const championship = await getDriverChampionshipAtRace(sessionKey);

    res.json({
      success: true,
      ...championship,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch driver championship",
    });
  }
});

router.get("/:sessionKey/championship/constructors", async (req, res) => {
  try {
    const sessionKey = Number(req.params.sessionKey);

    if (isNaN(sessionKey)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session key",
      });
    }

    const championship = await getConstructorsChampionshipAtRace(sessionKey);

    res.json({
      success: true,
      ...championship,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch constructors championship",
    });
  }
});

export default router;
