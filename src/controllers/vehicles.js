import { supabase } from "../lib/supabase.js";

export const addVehicle = async (req, res) => {
  try {
    const { plate_number, capacity, vehicle_model } = req.body;
    const operatorId = req.user.user_id; // Grabbed from auth middleware session

    // 1. Automatically fetch the park_id using the operatorId
    const { data: parkData, error: parkError } = await supabase
      .from("parks")
      .select("id")
      .eq("park_operator_id", operatorId)
      .limit(1)
      .maybeSingle();

    if (parkError) {
      return res.status(500).json({ error: parkError.message });
    }

    if (!parkData) {
      return res
        .status(404)
        .json({ message: "No registered park found for this operator." });
    }

    const park_id = parkData.id; // 👈 Successfully extracted automatically

    // 2. Double check if the plate number already exists globally
    const { data: duplicatePlate } = await supabase
      .from("vehicles")
      .select("id")
      .eq("plate_number", plate_number)
      .maybeSingle();

    if (duplicatePlate) {
      return res
        .status(409)
        .json({ message: "Vehicle with this plate number already exists." });
    }

    // 3. Count how many vehicles currently exist ONLY in this specific park
    const { count, error: countError } = await supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("park_id", park_id);

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    // 4. Increment the count by 1 for the new code generation marker
    const nextScopeNumber = (count || 0) + 1;
    const computedBusId = `BUS-${nextScopeNumber}`;

    // 5. Insert the new vehicle record
    const { data: newVehicle, error: insertError } = await supabase
      .from("vehicles")
      .insert([
        {
          park_id: park_id,
          park_operator_id: operatorId,
          bus_id: computedBusId, // e.g., BUS-1, BUS-2 scoped to this park
          plate_number: plate_number,
          capacity: capacity || 14,
          vehicle_model: vehicle_model || "Standard Bus",
          status: "active", // 👈 Default set to active as requested
        },
      ])
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(201).json({
      message: "Vehicle added successfully",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getOperatorVehicles = async (req, res) => {
  try {
    // Queries all vehicles matching the authenticated operator's ID
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("park_operator_id", req.user.user_id)
      .order("created_at", { ascending: false }); // Newest vehicles first

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      count: vehicles.length,
      vehicles: vehicles,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const { vehicle_id, plate_number, capacity, vehicle_model, status } =
      req.body;
    const operatorId = req.user.user_id;

    if (!vehicle_id) {
      return res.status(400).json({ message: "Vehicle ID is required." });
    }

    // 1. Check if the new plate number is already taken by another vehicle
    if (plate_number) {
      const { data: duplicatePlate } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate_number", plate_number)
        .neq("id", vehicle_id) // Exclude this current vehicle
        .maybeSingle();

      if (duplicatePlate) {
        return res.status(409).json({
          message: "Another vehicle is already using this plate number.",
        });
      }
    }

    // 2. Construct dynamic update payload
    const updateData = {};
    if (plate_number) updateData.plate_number = plate_number;
    if (capacity) updateData.capacity = capacity;
    if (vehicle_model) updateData.vehicle_model = vehicle_model;
    if (status) updateData.status = status;

    // 3. Execute update scoped to the operator
    const { data: updatedVehicle, error } = await supabase
      .from("vehicles")
      .update(updateData)
      .eq("id", vehicle_id)
      .eq("park_operator_id", operatorId) // Security check
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!updatedVehicle) {
      return res
        .status(404)
        .json({ message: "Vehicle not found or unauthorized." });
    }

    return res.status(200).json({
      message: "Vehicle updated successfully",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
