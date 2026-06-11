import { supabase } from "../lib/supabase.js";

export const assignDriver = async (req, res) => {
  try {
    const { vehicle_id, driver_id } = req.body;
    const { user_role } = req.user;

    if (user_role !== "operator") {
      return res
        .status(403)
        .json({ message: "Access denied. Operators only." });
    }

    const { data: driverBusy, error: driverCheckError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("current_driver_id", driver_id)
      .maybeSingle();

    if (driverCheckError)
      return res.status(500).json({ error: driverCheckError.message });
    if (driverBusy) {
      return res.status(409).json({
        message: "This driver is already assigned to another vehicle.",
      });
    }

    const { data: updatedVehicle, error: assignError } = await supabase
      .from("vehicles")
      .update({ current_driver_id: driver_id, updated_at: new Date() })
      .eq("id", vehicle_id)
      .select()
      .single();

    if (assignError)
      return res.status(500).json({ error: assignError.message });

    return res.status(200).json({
      message: "Driver assigned successfully",
      vehicle: updatedVehicle,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAssignments = async (req, res) => {
  try {
    const { user_id, user_role } = req.user;

    if (user_role === "operator") {
      const { data: fleet, error: fleetError } = await supabase
        .from("vehicles")
        .select(
          `
          id,
          plate_number,
          vehicle_model,
          current_driver_id,
          drivers (
            id,
            name,
            phone,
            license
          )
        `,
        )
        .not("current_driver_id", "is", null);

      if (fleetError)
        return res.status(500).json({ error: fleetError.message });
      return res.status(200).json({ role: "operator", assignments: fleet });
    } else if (user_role === "driver") {
      const { data: myVehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .select("id, plate_number, vehicle_model, status")
        .eq("current_driver_id", user_id)
        .maybeSingle();

      if (vehicleError)
        return res.status(500).json({ error: vehicleError.message });
      if (!myVehicle) {
        return res.status(404).json({
          message: "You have not been assigned to any vehicle yet today.",
        });
      }

      return res.status(200).json({ role: "driver", vehicle: myVehicle });
    }

    return res.status(403).json({ message: "Unauthorized profile access." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateAssignment = async (req, res) => {
  try {
    const { vehicle_id, new_driver_id } = req.body;
    const { user_role } = req.user;

    if (user_role !== "operator") {
      return res
        .status(403)
        .json({ message: "Access denied. Operators only." });
    }

    await supabase
      .from("vehicles")
      .update({ current_driver_id: null, updated_at: new Date() })
      .eq("current_driver_id", new_driver_id);

    const { data: reallocatedVehicle, error: updateError } = await supabase
      .from("vehicles")
      .update({ current_driver_id: new_driver_id, updated_at: new Date() })
      .eq("id", vehicle_id)
      .select()
      .single();

    if (updateError)
      return res.status(500).json({ error: updateError.message });

    return res.status(200).json({
      message: "Vehicle reassigned successfully",
      vehicle: reallocatedVehicle,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
