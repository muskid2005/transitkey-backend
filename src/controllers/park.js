import { supabase } from "../lib/supabase.js";

export const parkRegister = async (req, res) => {
  const {
    park_name,
    park_location,
    state_located,
    vehicle_count,
    opening_time,
    closing_time,
  } = req.body;

  const { data: existingPark, error: existingParkError } = await supabase
    .from("parks")
    .select("id")
    .eq("park_name", park_name)
    .limit(1)
    .maybeSingle();

  if (existingParkError) {
    return res.status(500).json({
      error: existingParkError.message,
    });
  }

  if (existingPark && existingPark.length > 0) {
    return res.status(409).json({ message: "User Already Exist" });
  }

  const { data: createPark, error: createParkError } = await supabase
    .from("parks")
    .insert([
      {
        park_operator_id: req.user.user_id,
        park_name: park_name,
        park_location: park_location,
        state_located: state_located,
        vehicle_count: vehicle_count,
        opening_time: opening_time,
        closing_time: closing_time,
      },
    ]);

  if (createParkError) {
    return res.status(500).json({ error: createParkError.message });
  }

  res.status(201).json({
    message: "Park registered successfully",
  });
};
