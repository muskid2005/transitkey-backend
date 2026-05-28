import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";

import entry from "./src/routes/entryRoute.js";
import logout from "./src/routes/exitRoute.js";
import refresh from "./src/routes/refreshTokenRoute.js";
import report from "./src/routes/reportRoute.js";
import trip from "./src/routes/tripRoute.js";

dotenv.config();

const app = express();
app.use(cookieParser());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
const PORT = process.env.PORT;

app.get("/", (req, res) => {
  res.json({ message: "yellow" });
});

app.get("/health", (req, res) => {
  res.send("k");
});

app.use("/auth", entry);
app.use("/refresh", refresh);
app.use("/logout", logout);
app.use("/notification", report);
// app.use("/update", notification);
app.use("/transport", trip);

app.listen(PORT, () =>
  console.log(`server running on http://localhost:${PORT}`),
);
