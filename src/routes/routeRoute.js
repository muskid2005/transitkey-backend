import express from "express";
import { verifyOperator, verifyUser } from "../middlewares/auth.js";
import {
  addRoute,
  getRoutes,
  updateRoute,
  getAllRoutes,
} from "../controllers/route.js";

const router = express.Router();

router.post("/routes", verifyOperator, addRoute);
router.get("/routes", verifyOperator, getRoutes);
router.put("/routes", verifyOperator, updateRoute);

router.get("/routesuser", verifyUser, getAllRoutes);

export default router;
