import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { supabase } from "../lib/supabase.js";

export const report = async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.accessToken, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, title, message, type } = req.body;

    const { data: currentTrip, error: tripError } = await supabase
      .from("trips")
      .select("user_id, driver_id, park_id")
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
      .select("id, client_name")
      .eq("id", currentTrip.driver_id)
      .limit(1);

    if (driverError) {
      return res.status(500).json({ error: driverError.message });
    }

    const { data: notification, error: notificationError } = await supabase
      .from("reports")
      .insert([
        {
          title: title,
          message: message,
          type: type,
          user_id: decoded.user_id,
          role: decoded.user_role,
          reference_id: currentTrip.id,
        },
      ])
      .select()
      .single();

    res.status(201).json({
      driver: driver[0].client_name,
      name: name,
      title: notification.title,
      message: notification.message,
      type: notification.type,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
