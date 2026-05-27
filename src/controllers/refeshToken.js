import jwt from "jsonwebtoken";
import dotenv from "dotenv";

export const newToken = (req, res) => {
  try {
    const payload = { user_id: decoded.user_id };

    const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 10 * 60 * 1000,
    });
    res.status(201).json({ message: "successful" });
  } catch (error) {
    return res.status(401).json({ message: "invalid refresh token" });
  }
};
