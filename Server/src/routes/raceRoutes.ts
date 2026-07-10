import express from 'express';

const router = express.Router();

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';

interface JolpicaResponse {
  MRData: {
    RaceTable: {
      Races: any[];
    };
  };
}

// Get all races for a season
router.get('/:season', async (req, res) => {
  try {
    const { season } = req.params;
    const response = await fetch(`${JOLPICA_BASE}/${season}/races.json`);
    const data = await response.json() as JolpicaResponse;
    const races = data.MRData.RaceTable.Races;
    res.json({ success: true, races });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch races' });
  }
});

// Get lap times for a specific race
router.get('/:season/:round/laps', async (req, res) => {
  try {
    const { season, round } = req.params;
    const response = await fetch(
      `${JOLPICA_BASE}/${season}/${round}/laps.json?limit=2000`
    );
    const data = await response.json() as any;
    const laps = data.MRData.RaceTable.Races[0]?.Laps || [];
    res.json({ success: true, laps });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch laps' });
  }
});
export default router;