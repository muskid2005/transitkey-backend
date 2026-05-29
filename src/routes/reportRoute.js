import express from "express";
import { verifyUser } from "../middlewares/auth.js";

const router = express.Router();
import { report } from "../controllers/report.js";

router.post("/report", verifyUser, report);

export default router;
