import express from "express";
import { verifyOperator } from "../middlewares/auth.js";
import { refrenceCode } from "../controllers/refrenceCode.js";

const router = express.Router();

router.get("/code", verifyOperator, refrenceCode);

export default router;
