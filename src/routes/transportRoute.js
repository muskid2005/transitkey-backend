import express from "express";
import { verifyUser } from "../middlewares/auth.js";
import { bookSeat, cancelBooking } from "../controllers/transport.js";

const router = express.Router();

router.post("/book", verifyUser, bookSeat);

router.post("/cancel", verifyUser, cancelBooking);

export default router;
