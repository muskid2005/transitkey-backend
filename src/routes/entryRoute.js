import express from "express";
import { verifyUser } from "../middlewares/auth.js";
import { userRegister, userLogin } from "../controllers/userAuth.js";
import {
  inputValidation,
  validateInput,
} from "../middlewares/inputValidation.js";

const router = express.Router();

router.post("/api/register", inputValidation, validateInput, userRegister);
router.post("/api/login", inputValidation, validateInput, userLogin);

export default router;
