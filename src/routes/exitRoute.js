import express from "express";
const router = express.Router();

router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.clearCookie("accessToken");
  return res.json({ message: "Logged out successfully" });
});

export default router;
