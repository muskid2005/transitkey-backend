import { supabase } from "../lib/supabase.js";

export const addVehicle = async (req, res) => {
  try {
    const { plate_number, capacity, vehicle_model } = req.body;
    const operatorId = req.user.user_id; // Grabbed from auth middleware session

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

    const park_id = parkData.id;

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

    const { count, error: countError } = await supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("park_id", park_id);

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    const nextScopeNumber = (count || 0) + 1;
    const computedBusId = `BUS-${nextScopeNumber}`;

    const { data: newVehicle, error: insertError } = await supabase
      .from("vehicles")
      .insert([
        {
          park_id: park_id,
          park_operator_id: operatorId,
          bus_id: computedBusId,
          plate_number: plate_number,
          capacity: capacity || 14,
          vehicle_model: vehicle_model || "Standard Bus",
          status: "active", //
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
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("park_operator_id", req.user.user_id)
      .order("created_at", { ascending: false });

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

    const updateData = {};
    if (plate_number) updateData.plate_number = plate_number;
    if (capacity) updateData.capacity = capacity;
    if (vehicle_model) updateData.vehicle_model = vehicle_model;
    if (status) updateData.status = status;

    const { data: updatedVehicle, error } = await supabase
      .from("vehicles")
      .update(updateData)
      .eq("id", vehicle_id)
      .eq("park_operator_id", operatorId)
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
