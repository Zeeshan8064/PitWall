import { Router } from "express";

import { getStrategyModel } from "../services";
import { describeError } from "../utils/httpError";

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
    console.error("Failed to build strategy model:", error);

    // A session with no laps, or one that is not a race, is a missing
    // resource rather than a server fault — describeError makes that call and
    // withholds the message for anything unexpected.
    const { status, message } = describeError(
      error,
      "Failed to build strategy model"
    );

    res.status(status).json({ success: false, message });
  }
});

export default router;
