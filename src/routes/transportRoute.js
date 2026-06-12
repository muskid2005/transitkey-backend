import express from "express";
import { verifyUser } from "../middlewares/auth.js";
import {
  createBooking,
  getMyBooking,
  cancelBooking,
} from "../controllers/transport.js";

const router = express.Router();

router.post("/book", verifyUser, createBooking);
router.get("/my-booking", verifyUser, getMyBooking);
router.put("/cancel", verifyUser, cancelBooking);

export default router;
