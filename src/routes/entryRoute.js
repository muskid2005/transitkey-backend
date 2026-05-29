import express from "express";
import { verifyUser } from "../middlewares/auth.js";
import { userRegister, userLogin } from "../controllers/userAuth.js";
import {
  emailValidation,
  passswordValidation,
  numberValidation,
  nameValidation,
  validateInput,
} from "../middlewares/inputValidation.js";

const router = express.Router();

router.post(
  "/api/register",
  emailValidation,
  passswordValidation,
  numberValidation,
  nameValidation,
  validateInput,
  userRegister,
);
router.post(
  "/api/login",
  passswordValidation,
  numberValidation,
  validateInput,
  userLogin,
);

export default router;
