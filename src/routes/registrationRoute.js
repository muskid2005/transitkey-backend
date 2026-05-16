import express from "express";
import { userRegister } from "../controllers/userAuth.js";
import {
  inputValidation,
  validateInput,
} from "../middlewares/inputValidation.js";

const router = express.Router();

router.post("/register", inputValidation, validateInput, userRegister);

export default router;
