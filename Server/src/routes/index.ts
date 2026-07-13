import { Router } from "express";

import seasons from "./seasons";
import drivers from "./drivers";
import laps from "./laps";
import stints from "./stints";
import pitstops from "./pitstops";
import intervals from "./intervals";
import raceData from "./raceData";

const router = Router();

router.use(seasons);
router.use(drivers);
router.use(laps);
router.use(stints);
router.use(pitstops);
router.use(intervals);
router.use(raceData);

export default router;