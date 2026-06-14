import express from "express";
import { verifyOperator } from "../middlewares/auth.js";
import { getAllTrips } from "../controllers/getAllTrips.js"

const router = express.Router();

router.get("/trips", verifyOperator, getAllTrips);

export default router;
