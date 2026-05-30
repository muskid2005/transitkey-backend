import express from "express";
import { verifyOperator } from "../middlewares/auth.js";
import {
  addVehicle,
  getOperatorVehicles,
  updateVehicle,
} from "../controllers/vehicles.js";

const router = express.Router();

router.post("/vehicles", verifyOperator, addVehicle);
router.get("/vehicles", verifyOperator, getOperatorVehicles);
router.put("/vehicles", verifyOperator, updateVehicle);

export default router;
