import express from "express";
import { verifyOperator, verifyUser } from "../middlewares/auth.js";
import { addRoute, getRoutes, updateRoute } from "../controllers/route.js";

const router = express.Router();

router.post("/routes", verifyOperator, addRoute);
router.get("/routes", verifyUser, getRoutes);
router.put("/routes", verifyOperator, updateRoute);

export default router;
