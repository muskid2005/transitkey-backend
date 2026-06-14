
import express from "express";
import { verifyOperator } from "../middlewares/auth.js";
import { assignDriverAndVehicleToTrip } from "../controllers/tripVehicle.js"

const router = express.Router();

router.post("/trips", verifyOperator, assignDriverAndVehicleToTrip);

export default router;
