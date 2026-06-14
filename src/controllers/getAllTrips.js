import { supabase } from "../lib/supabase.js";

export const getAllTrips = async (req, res) => {
  try {
    const { user_id, user_role } = req.user; 

    if (user_role !== "operator") {
      return res.status(403).json({ message: "Access denied. Only park operators can view this manifest." });
    }

    const { data: trips, error } = await supabase
      .from("trips")
      .select(`
        id,
        park_id,
        route_id,
        driver_id,
        vehicle_id,
        fare,
        available_seats,
        status,
        created_at,
        routes (
          destination,
          capacity,
          parks (
            park_location
          )
        )
      `)
      .eq("status", "at park")
      .eq("park_operator_id", user_id) 
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const formattedTrips = trips.map(trip => ({
      trip_id: trip.id,
      park_id: trip.park_id,
      route_id: trip.route_id,
      driver_id: trip.driver_id, 
      vehicle_id: trip.vehicle_id, 
      fare: trip.fare,
      available_seats: trip.available_seats,
      total_capacity: trip.routes?.capacity || 14,
      status: trip.status,
      origin_park: trip.routes?.parks?.park_location || "Unknown Park",
      destination: trip.routes?.destination || "Unknown Destination",
      created_at: trip.created_at
    }));

    return res.status(200).json({ trips: formattedTrips });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};