import { body, validationResult } from "express-validator";

export const inputValidation = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Enter a valid email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("password must be 6+ characters"),
  body("number").notEmpty().withMessage("phone number is required"),
];

export const validateInput = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array() });
  }
  next();
};
