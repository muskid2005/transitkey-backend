import jwt from "jsonwebtoken";
import dotenv from "dotenv";

export const newToken = (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: "no Nefresh Token" });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const payload = { user_id: decoded.user_id };

    const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET);
    res.status(201).json({ newAccessToken: newAccessToken });
  } catch (error) {
    return res.status(401).json({ message: "invalid refresh token" });
  }
};
