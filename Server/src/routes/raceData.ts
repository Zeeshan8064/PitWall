import { Router } from "express";
import { getRaceData } from "../services";

const router = Router();

router.get('/:sessionKey/race-data', async(req,res) => {
    try{
        const sessionKey = Number(req.params.sessionKey);
        if (isNaN(sessionKey)) {
        return res.status(400).json({
        success: false,
        message: "Invalid session key",
      });
    }
    const raceData = await getRaceData(sessionKey);
    res.json({
        success: true,
        ...raceData,
    });
    }catch(error){
        console.error(error);
        res.status(500).json({
            success:false,
            message:"Failed to fetch race data",
        });
    }
});

export default router;