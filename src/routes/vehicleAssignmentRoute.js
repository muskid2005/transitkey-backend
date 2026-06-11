import {
  updateAssignment,
  getAssignments,
  assignDriver,
} from "../controllers/vehicleAssignment.js";

import { verifyUser, verifyOperator } from "../middlewares/auth.js";

import express from "express";

const router = express.Router();

router.post("/assign-driver", verifyOperator, assignDriver);
router.get("/assignments", verifyOperator, getAssignments);
router.put("/update-assignment", verifyOperator, updateAssignment);

export default router;
