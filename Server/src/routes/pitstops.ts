import { Router } from "express";
import { getPitstops } from "../services";

const router = Router();

router.get('/:sessionKey/pitstops', async(req,res) => {
    try{
        const sessionKey = Number(req.params.sessionKey);
        if (isNaN(sessionKey)) {
        return res.status(400).json({
        success: false,
        message: "Invalid session key",
      });
    }
    const pitstops = await getPitstops(sessionKey);
    res.json({
        success: true,
        pitstops,
    });
    }catch(error){
        console.error(error);
        res.status(500).json({
            success:false,
            message:"Failed to fetch Pitstops",
        });
    }
});

export default router;