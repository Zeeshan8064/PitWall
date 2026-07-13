import { Router } from "express";
import { getStints } from "../services";

const router = Router();

router.get('/:sessionKey/stints', async(req,res) => {
    try{
        const sessionKey = Number(req.params.sessionKey);
        if (isNaN(sessionKey)) {
        return res.status(400).json({
        success: false,
        message: "Invalid session key",
      });
    }
    const stints = await getStints(sessionKey);
    res.json({
        success: true,
        stints,
    });
    }catch(error){
        console.error(error);
        res.status(500).json({
            success:false,
            message:"Failed to fetch stints",
        });
    }
});

export default router;