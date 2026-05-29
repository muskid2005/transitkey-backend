import { supabase } from "../lib/supabase.js";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const userRegister = async (req, res) => {
  try {
    const { name, email, number, password, code } = req.body;

    let role = "user";

    if (code) {
      const { data: codeData, error: codeDataError } = await supabase
        .from("refrence_code")
        .select("id")
        .eq("is_used", false)
        .eq("code", code)
        .limit(1)
        .maybeSingle();

      if (codeDataError) {
        return res.status(500).json({ error: codeDataError.message });
      }

      if (!codeData) {
        return res
          .status(400)
          .json({ message: "Invalid or expired reference code." });
      }

      role = "driver";
    }

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
      .insert({
        client_name: name,
        email: email,
        phone: number,
        password: protectedPassword,
        role: role,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data: updateCodeData, error: updateCodeDataError } = await supabase
      .from("refrence_code")
      .update([
        {
          used_by: createUser.id,
          user_name: createUser.client_name,
          is_used: true,
        },
      ])
      .eq("code", code);

    if (updateCodeDataError) {
      return res.status(500).json({ error: updateCodeDataError.message });
    }

    const payload = {
      user_id: createUser.id,
      user_name: createUser.client_name,
      user_role: createUser.role,
    };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const isProduction = process.env.NODE_ENV === "production";
    const refreshPayload = { user_id: createUser.id };
    const refreshToken = jwt.sign(refreshPayload, process.env.REFRESH_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 10 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "Success",
      user: {
        email: createUser.email || null,
        number: createUser.phone || null,
        name: createUser.client_name,
        role: createUser.role,
        id: createUser.id,
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

    const isProduction = process.env.NODE_ENV === "production";
    const payload = {
      user_id: userExist[0].id,
      user_name: userExist[0].client_name,
      user_role: userExist[0].role,
    };
    const refreshPayload = { user_id: userExist[0].id };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign(refreshPayload, process.env.REFRESH_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 60 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Success",
      user: {
        email: userExist[0].email || null,
        number: userExist[0].phone || null,
        name: userExist[0].client_name,
        role: userExist[0].role,
        id: userExist[0].id,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
