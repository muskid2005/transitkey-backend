import dotenv from "dotenv";
import jwt from "jsonwebtoken";

export const verifyUser = (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

    next();
  } catch (error) {
    return res.status(401).json({ message: "invalid token" });
  }
};
