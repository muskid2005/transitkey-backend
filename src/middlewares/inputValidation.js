import { body, validationResult } from "express-validator";

export const emailValidation = body("email")
  .optional()
  .isEmail()
  .withMessage("Enter a valid email")
  .normalizeEmail();

export const passswordValidation = body("password")
  .isLength({ min: 6 })
  .withMessage("password must be 6+ characters");

export const numberValidation = body("number")
  .notEmpty()
  .withMessage("phone number is required");

export const nameValidation = body("name")
  .isLength({ min: 5 })
  .withMessage("name must be between 5 and 20 characters");

export const validateInput = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array() });
  }
  next();
};
