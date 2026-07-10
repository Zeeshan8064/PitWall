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

export default router;