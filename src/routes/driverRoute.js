import express from "express";
import { verifyOperator } from "../middlewares/auth.js";
import { addDriver, getDriver } from "../controllers/EditDriver.js";

const router = express.Router();

router.post("/adddriver", verifyOperator, addDriver);
router.get("/getdriver", verifyOperator, getDriver);
// router.put("/updatedriver", verifyOperator, updateDriver);

export default router;
