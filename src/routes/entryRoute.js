import express from "express";
import { userRegister, userLogin } from "../controllers/userAuth.js";
import {
  inputValidation,
  validateInput,
} from "../middlewares/inputValidation.js";

const router = express.Router();

router.post("/register", inputValidation, validateInput, userRegister);
router.post("/login", inputValidation, validateInput, userLogin);

export default router;
