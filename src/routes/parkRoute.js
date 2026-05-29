import express from "express";
import { verifyUser, verifyOperator } from "../middlewares/auth.js";
import {
  parkRegister,
  updatePark,
  getParkDetails,
} from "../controllers/park.js";

const router = express.Router();

router.post("/park", verifyOperator, parkRegister);
router.put("/park", verifyOperator, updatePark);
router.get("/park", verifyOperator, getParkDetails);

export default router;
