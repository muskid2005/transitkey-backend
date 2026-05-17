import { supabase } from "../lib/supabase.js";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const userRegister = async (req, res) => {
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
      const { data: existingEmail, error: existingEmailError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .limit(1);

      if (existingEmailError) {
        return res.status(500).json({
          error: existingEmailError.message,
        });
      }

      if (existingEmail && existingEmail.length > 0) {
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
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const refreshPayload = { user_id: createUser.id };
    const refreshToken = jwt.sign(refreshPayload, process.env.REFRESH_SECRET, {
      expiresIn: "30d",
    });

    res.status(201).json({
      message: "Success",
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: {
        email: createUser.email || null,
        number: createUser.phone || null,
        name: createUser.client_name,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const userLogin = async (req, res) => {
  try {
    const { number, password } = req.body;
    const { data: userExist, error: userExistError } = await supabase
      .from("users")
      .select("phone, email, role, id, password, client_name")
      .eq("phone", number)
      .limit(1);

    if (userExistError) {
      return res.status(401).json({ error: userExistError.message });
    }
    if (userExist.length <= 0) {
      return res
        .status(401)
        .json({ message: "you don't have an accout with us" });
    }

    const hashedPassword = userExist[0].password;
    const passwordCheck = await argon2.verify(hashedPassword, password);

    if (!passwordCheck) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const payload = { user_id: userExist[0].id, user_role: userExist[0].role };
    const refreshPayload = { user_id: userExist[0].id };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign(refreshPayload, process.env.REFRESH_SECRET, {
      expiresIn: "30d",
    });

    res.status(200).json({
      message: "Success",
      name: userExist[0].client_name,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
