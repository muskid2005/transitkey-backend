import express from "express";
import dotenv from "dotenv";
import register from "./src/routes/entryRoute.js";
import helmet from "helmet";
import morgan from "morgan";

dotenv.config();

const app = express();
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
const PORT = process.env.PORT;

app.get("/", (req, res) => {
  res.json({ message: "yellow" });
});

app.use("/auth", register);

app.listen(PORT, () =>
  console.log(`server running on http://localhost:${PORT}`),
);
