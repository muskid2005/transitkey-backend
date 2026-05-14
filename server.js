import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.json({ message: "yellow" });
});

app.listen(PORT, () =>
  console.log(`server running on http://localhost:${PORT}`),
);
