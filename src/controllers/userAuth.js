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
      .insert({
        client_name: name,
        email: email,
        phone: number,
        password: protectedPassword,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
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
    const { number, password, code, email } = req.body;
    const isProduction = process.env.NODE_ENV === "production";

    if (code) {
      const { data: codeData, error: codeDataError } = await supabase
        .from("refrence_code")
        .select("id")
        .eq("is_used", false)
        .eq("code", code)
        .maybeSingle();

      if (codeDataError)
        return res.status(500).json({ error: codeDataError.message });
      if (!codeData)
        return res
          .status(400)
          .json({ message: "Invalid or expired reference code." });

      const { data: driverGrab, error: driverGrabError } = await supabase
        .from("drivers")
        .select("phone, email, name")
        .eq("phone", number)
        .maybeSingle();

      if (driverGrabError)
        return res.status(500).json({ error: driverGrabError.message });
      if (!driverGrab)
        return res.status(409).json({ message: "Invalid credentials" });

      const { data: userExist, error: userExistError } = await supabase
        .from("users")
        .select("id, password")
        .eq("phone", number)
        .maybeSingle();

      if (userExistError)
        return res.status(500).json({ error: userExistError.message });
      if (userExist)
        return res.status(400).json({
          message:
            "Account already exists. Please log in without a reference code.",
        });

      const protectedPassword = await argon2.hash(password);
      const { data: createUser, error: createUserError } = await supabase
        .from("users")
        .insert({
          client_name: driverGrab.name,
          email: driverGrab.email,
          phone: driverGrab.phone,
          role: "driver",
          password: protectedPassword,
        })
        .select()
        .single();

      if (createUserError)
        return res.status(500).json({ error: createUserError.message });

      const { error: updateCodeDataError } = await supabase
        .from("refrence_code")
        .update({
          used_by: createUser.id,
          user_name: createUser.client_name,
          is_used: true,
          updated_at: new Date(),
        })
        .eq("code", code);

      if (updateCodeDataError)
        return res.status(500).json({ error: updateCodeDataError.message });

      const { error: driverFillError } = await supabase
        .from("drivers")
        .update({ driver_user_id: createUser.id, updated_at: new Date() })
        .eq("phone", number);

      if (driverFillError)
        return res.status(500).json({ error: driverFillError.message });

      const payload = {
        user_id: createUser.id,
        user_name: createUser.client_name,
        user_role: createUser.role,
      };
      const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      const refreshToken = jwt.sign(
        { user_id: createUser.id },
        process.env.REFRESH_SECRET,
        { expiresIn: "7d" },
      );

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

      return res.status(201).json({
        message: "Success",
        user: {
          email: createUser.email || null,
          number: createUser.phone || null,
          name: createUser.client_name,
          role: createUser.role,
          id: createUser.id,
        },
      });
    }

    if (!number && !email) {
      return res
        .status(400)
        .json({
          message: "please provide either email or phone number to login",
        });
    }

    let query = supabase
      .from("users")
      .select("phone, email, role, id, password, client_name");

    if (number) {
      query = query.eq("phone", number);
    } else {
      query = query.eq("email", email);
    }

    const { data: userExist, error: userExistError } =
      await query.maybeSingle();

    if (userExistError)
      return res.status(500).json({ error: userExistError.message });
    if (!userExist) {
      return res
        .status(401)
        .json({ message: "You don't have an account with us" });
    }

    const passwordCheck = await argon2.verify(userExist.password, password);
    if (!passwordCheck)
      return res.status(401).json({ message: "Invalid Credentials" });

    const payload = {
      user_id: userExist.id,
      user_name: userExist.client_name,
      user_role: userExist.role,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign(
      { user_id: userExist.id },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" },
    );

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

    return res.status(200).json({
      message: "Success",
      user: {
        email: userExist.email || null,
        number: userExist.phone || null,
        name: userExist.client_name,
        role: userExist.role,
        id: userExist.id,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// if (number) {
//       const { data: userExist, error: userExistError } = await supabase
//         .from("users")
//         .select("phone, email, role, id, password, client_name")
//         .eq("phone", number)
//         .maybeSingle();

//       if (userExistError)
//         return res.status(500).json({ error: userExistError.message });
//       if (!userExist)
//         return res
//           .status(401)
//           .json({ message: "You don't have an account with us" });

//       const passwordCheck = await argon2.verify(userExist.password, password);
//       if (!passwordCheck)
//         return res.status(401).json({ message: "Invalid Credentials" });

//       const payload = {
//         user_id: userExist.id,
//         user_name: userExist.client_name,
//         user_role: userExist.role,
//       };
//       const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
//         expiresIn: "1h",
//       });
//       const refreshToken = jwt.sign(
//         { user_id: userExist.id },
//         process.env.REFRESH_SECRET,
//         { expiresIn: "7d" },
//       );

//       res.cookie("accessToken", accessToken, {
//         httpOnly: true,
//         secure: isProduction,
//         sameSite: isProduction ? "strict" : "lax",
//         maxAge: 60 * 60 * 1000,
//       });
//       res.cookie("refreshToken", refreshToken, {
//         httpOnly: true,
//         secure: isProduction,
//         sameSite: isProduction ? "strict" : "lax",
//         maxAge: 7 * 24 * 60 * 60 * 1000,
//       });

//       return res.status(200).json({
//         message: "Success",
//         user: {
//           email: userExist.email || null,
//           number: userExist.phone || null,
//           name: userExist.client_name,
//           role: userExist.role,
//           id: userExist.id,
//         },
//       });
//     }
//     if (email) {
//       const { data: userExist, error: userExistError } = await supabase
//         .from("users")
//         .select("phone, email, role, id, password, client_name")
//         .eq("email", email)
//         .maybeSingle();

//       if (userExistError)
//         return res.status(500).json({ error: userExistError.message });
//       if (!userExist)
//         return res
//           .status(401)
//           .json({ message: "You don't have an account with us" });

//       const passwordCheck = await argon2.verify(userExist.password, password);
//       if (!passwordCheck)
//         return res.status(401).json({ message: "Invalid Credentials" });

//       const payload = {
//         user_id: userExist.id,
//         user_name: userExist.client_name,
//         user_role: userExist.role,
//       };
//       const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
//         expiresIn: "1h",
//       });
//       const refreshToken = jwt.sign(
//         { user_id: userExist.id },
//         process.env.REFRESH_SECRET,
//         { expiresIn: "7d" },
//       );

//       res.cookie("accessToken", accessToken, {
//         httpOnly: true,
//         secure: isProduction,
//         sameSite: isProduction ? "strict" : "lax",
//         maxAge: 60 * 60 * 1000,
//       });
//       res.cookie("refreshToken", refreshToken, {
//         httpOnly: true,
//         secure: isProduction,
//         sameSite: isProduction ? "strict" : "lax",
//         maxAge: 7 * 24 * 60 * 60 * 1000,
//       });

//       return res.status(200).json({
//         message: "Success",
//         user: {
//           email: userExist.email || null,
//           number: userExist.phone || null,
//           name: userExist.client_name,
//           role: userExist.role,
//           id: userExist.id,
//         },
//       });
//     }
