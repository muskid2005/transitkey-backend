import express from "express";
import { supabase } from "../lib/supabase.js";
import argon2 from "argon2";
import {
  inputValidation,
  validateInput,
} from "../middlewares/inputValidation.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();

router.post("/register", inputValidation, validateInput, async (req, res) => {
  try {
    const { name, email, number, password } = req.body;

    const { data: existingNumber, error: existingNumberError } = await supabase
      .from("users")
      .select("id")
      .eq("phone", number)
      .limit(1);

    if (existingNumberError) {
      return res.status(500).json({
        error: existingNumberError.message,
      });
    }

    if (existingNumber && existingNumber.length > 0) {
      return res.status(409).json({ message: "User Already Exist" });
    }

    if (email) {
      const { data: existingeMail, error: existingeMailError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .limit(1);

      if (existingEmailError) {
        return res.status(500).json({
          error: existingEmailError.message,
        });
      }

      if (existingMail && existingeMail.length > 0) {
        return res.status(409).json({ message: "User Already Exist" });
      }
    }

    const protectedPassword = await argon2.hash(password);

    const { data: createUser, error } = await supabase
      .from("users")
      .insert([
        {
          client_name: name,
          email: email,
          phone: number,
          password: protectedPassword,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const payload = { user_id: createUser.id, user_role: createUser.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).json({
      message: "Success",
      token: token,
      user: {
        email: createUser.email || null,
        number: createUser.phone || null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
