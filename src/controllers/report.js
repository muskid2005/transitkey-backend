import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { supabase } from "../lib/supabase.js";

export const report = async (req, res) => {
  try {
    // const decoded = jwt.verify(req.cookies.accessToken, process.env.JWT_SECRET);

    // if (!decoded) {
    //   return res.status(401).json({ message: "Unauthorized" });
    // }

    const { image, cartegory, message, report_type, location, location_name } =
      req.body;

    const { data: currentTrip, error: tripError } = await supabase
      .from("trips")
      .select("id, driver_id, park_id, vehicle_id")
      .eq("user_id", decoded.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (tripError) {
      return res.status(500).json({ error: tripError.message });
    }
    if (!currentTrip) {
      return res
        .status(404)
        .json({ message: "No active trip found for the user" });
    }

    const { data: driver, error: driverError } = await supabase
      .from("users")
      .select("client_name")
      .eq("id", currentTrip.driver_id)
      .limit(1);

    if (driverError) {
      return res.status(500).json({ error: driverError.message });
    }

    if (!driver) {
      return res.status(404).json({ message: "no driver found" });
    }

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert([
        {
          user_id: decoded.user_id,
          driver_id: currentTrip.driver_id,
          vehicle_id: currentTrip.vehicle_id,
          park_id: currentTrip.park_id,
          trip_id: currentTrip.trip_id,
          description: message,
          report_type: report_type,
          cartegory: cartegory,
          location: location || null,
          location_name: location_name || null,
          image_url: img_url || null,
        },
      ]);

    if (reportError) {
      return res.status(500).json({ error: reportError.message });
    }

    res.status(201).json({
      message: "Report submitted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
