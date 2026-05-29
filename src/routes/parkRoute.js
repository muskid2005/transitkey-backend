import express from "express";
import { verifyUser, verifyOperator } from "../middlewares/auth.js";
import { parkRegister } from "../controllers/park.js";

const router = express.Router();

router.post("/park", verifyOperator, parkRegister);

export default router;
