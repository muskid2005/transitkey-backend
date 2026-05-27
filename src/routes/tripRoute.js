import express from "express";
import { verifyUser } from "../middlewares/auth.js";
import { trip } from "../controllers/trip.js";

const router = express.Router();

router.post("/api/trip", verifyUser, trip);

export default router;
