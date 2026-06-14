import { supabase } from "../lib/supabase.js";

export const assignDriverAndVehicleToTrip = async (req, res) => {
  try {
    const { user_id, user_role } = req.user;
    const { trip_id, vehicle_id, departure_time } = req.body;

    if (user_role !== "operator") {
      return res
        .status(403)
        .json({ message: "Only operators can assign trip configurations." });
    }

    if (!trip_id || !vehicle_id || !departure_time) {
      return res.status(400).json({
        message: "Missing required fields: trip_id, vehicle_id, or departure_time.",
      });
    }

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("park_id, park_operator_id")
      .eq("id", trip_id)
      .single();

    if (tripError || !trip) {
      return res
        .status(404)
        .json({ message: "Target trip group does not exist." });
    }

    if (trip.park_operator_id !== user_id) {
      return res.status(403).json({
        message: "Unauthorized. You cannot configure trips for an external park terminal.",
      });
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("current_driver_id, status")
      .eq("id", vehicle_id)
      .single();

    if (vehicleError || !vehicle) {
      return res.status(404).json({ message: "The selected vehicle does not exist." });
    }

    if (vehicle.status !== "active") {
      return res.status(400).json({ message: `This vehicle cannot be assigned because its current status is '${vehicle.status}'.` });
    }

    if (!vehicle.current_driver_id) {
      return res.status(400).json({ message: "This vehicle does not have a permanent driver assigned to it in the system." });
    }

    const { error: vehicleStatusError } = await supabase
      .from("vehicles")
      .update({ status: "assigned", updated_at: new Date() })
      .eq("id", vehicle_id);

    if (vehicleStatusError) {
      return res.status(500).json({ error: vehicleStatusError.message });
    }

    const todayDateStr = new Date().toISOString().split('T')[0]; 
    
    const formattedTimestamp = `${todayDateStr} ${departure_time}`;

    const { data: updatedTrip, error: updateError } = await supabase
      .from("trips")
      .update({
        vehicle_id: vehicle_id,
        driver_id: vehicle.current_driver_id, 
        departure_time: formattedTimestamp, 
        updated_at: new Date(),
      })
      .eq("id", trip_id)
      .select()
      .single();

    if (updateError) {
      await supabase.from("vehicles").update({ status: "active" }).eq("id", vehicle_id);
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      message: "Vehicle successfully assigned, driver linked automatically, and vehicle locked out!",
      trip: updatedTrip,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};