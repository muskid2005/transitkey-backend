import express from "express";
import { newToken } from "../controllers/refeshToken.js";
import { verifyUser } from "../middlewares/auth.js";

const router = express.Router();

router.post("/token", verifyUser, newToken);

export default router;
