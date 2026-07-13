import { Router } from "express";
import { getIntervals } from "../services";

const router = Router();

router.get('/:sessionKey/intervals', async(req,res) => {
    try{
        const sessionKey = Number(req.params.sessionKey);
        if (isNaN(sessionKey)) {
        return res.status(400).json({
        success: false,
        message: "Invalid session key",
      });
    }
    const intervals = await getIntervals(sessionKey);
    res.json({
        success: true,
        intervals,
    });
    }catch(error){
        console.error(error);
        res.status(500).json({
            success:false,
            message:"Failed to fetch Intervals",
        });
    }
});

export default router;