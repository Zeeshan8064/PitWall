import { Router } from "express";

import { getMeetingSessions, getSessionContext } from "../services";

const router = Router();

router.get("/meetings/:meetingKey/sessions", async (req, res) => {
  try {
    const meetingKey = Number(req.params.meetingKey);

    if (isNaN(meetingKey)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meeting key",
      });
    }

    const context = await getMeetingSessions(meetingKey);

    res.json({
      success: true,
      ...context,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch sessions",
    });
  }
});

router.get("/:sessionKey/session-context", async (req, res) => {
  try {
    const sessionKey = Number(req.params.sessionKey);

    if (isNaN(sessionKey)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session key",
      });
    }

    const context = await getSessionContext(sessionKey);

    res.json({
      success: true,
      ...context,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch session",
    });
  }
});

export default router;
