import express from "express";
import { newToken } from "../controllers/refeshToken";

const router = express.Router();

router.post("refresh-token", newToken);

export default router;
