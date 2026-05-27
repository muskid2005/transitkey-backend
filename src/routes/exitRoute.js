import express from "express";
const router = express.Router();

router.post("/api/logout", (req, res) => {
  res.clearCookie("refreshToken");
  return res.json({ message: "Logged out successfully" });
});

export default router;
