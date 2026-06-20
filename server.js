import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";

import { initBackgroundTasks } from "./src/utils/cronWorker.js"
import entry from "./src/routes/entryRoute.js";
import logout from "./src/routes/exitRoute.js";
import refresh from "./src/routes/refreshTokenRoute.js";
import report from "./src/routes/reportRoute.js";
import transport from "./src/routes/transportRoute.js";
import park from "./src/routes/parkRoute.js";
import code from "./src/routes/codeRoute.js";
import vehicle from "./src/routes/vehicleRoute.js";
import route from "./src/routes/routeRoute.js";
import driver from "./src/routes/driverRoute.js";
import getTrips from "./src/routes/allTripsRoute.js";
import assignVtrips from "./src/routes/assignVehicle2TripRoute.js";
import vehicleAssignment from "./src/routes/vehicleAssignmentRoute.js";

dotenv.config();

const app = express();
app.use(cookieParser());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(
  cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'https://transit-key.vercel.app'],
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

app.use("/api", entry);
app.use("/api", refresh);
app.use("/api", logout);
app.use("/api", report);
// app.use("/api", notification);
app.use("/api", transport);
app.use("/api", park);
app.use("/api", code);
app.use("/api", vehicle);
app.use("/api", route);
app.use("/api", driver);
app.use("/api", vehicleAssignment);
app.use("/api", getTrips);
app.use("/api", assignVtrips);

app.listen(PORT, () =>{
  console.log(`server running on http://localhost:${PORT}`);
  initBackgroundTasks();
});
