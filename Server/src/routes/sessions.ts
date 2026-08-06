import { Router } from "express";

import { getMeetingSessions, getSessionContext } from "../services";
import { describeError } from "../utils/httpError";

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
    console.error("Failed to fetch sessions:", error);

    const { status, message } = describeError(error, "Failed to fetch sessions");

    res.status(status).json({ success: false, message });
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
    console.error("Failed to fetch session:", error);

    const { status, message } = describeError(error, "Failed to fetch session");

    res.status(status).json({ success: false, message });
  }
});

export default router;
