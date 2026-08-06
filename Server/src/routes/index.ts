import { Router } from "express";

import seasons from "./seasons";
import drivers from "./drivers";
import teams from "./teams";
import championship from "./championship";
import sessions from "./sessions";
import strategy from "./strategy";
import laps from "./laps";
import stints from "./stints";
import pitstops from "./pitstops";
import intervals from "./intervals";
import positions from "./positions";
import raceData from "./raceData";

const router = Router();

router.use(seasons);
router.use(drivers);
router.use(teams);
// Before the race-scoped routers: the standings paths are literal-prefixed and
// must not be shadowed by a `/:sessionKey/...` pattern.
router.use(championship);
router.use(sessions);
router.use(strategy);
router.use(laps);
router.use(stints);
router.use(pitstops);
router.use(intervals);
router.use(positions);
router.use(raceData);

export default router;