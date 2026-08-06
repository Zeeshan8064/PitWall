import { Router } from "express";

import { getStrategyModel } from "../services";

const router = Router();

router.get("/:sessionKey/strategy", async (req, res) => {
  try {
    const sessionKey = Number(req.params.sessionKey);

    if (isNaN(sessionKey)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session key",
      });
    }

    const model = await getStrategyModel(sessionKey);

    res.json({
      success: true,
      ...model,
    });
  } catch (error) {
    console.error(error);

    const message =
      error instanceof Error ? error.message : "Failed to build strategy model";

    // A session with no laps, or one that is not a race, is a bad request
    // rather than a server fault.
    const clientError =
      message.includes("has not been ingested") ||
      message.includes("only applies to race sessions") ||
      message.includes("No lap data");

    res.status(clientError ? 404 : 500).json({ success: false, message });
  }
});

export default router;
