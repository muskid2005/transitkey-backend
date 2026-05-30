import { supabase } from "../lib/supabase.js";

export const parkRegister = async (req, res) => {
  try {
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

    if (existingPark) {
      return res.status(409).json({ message: "Park name Already Exist" });
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
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updatePark = async (req, res) => {
  try {
    const updateData = req.body;

    const { data: parks, error } = await supabase
      .from("parks")
      .update(updateData)
      .eq("park_operator_id", req.user.user_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: "park updated succesfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getParkDetails = async (req, res) => {
  try {
    const { data: getPark, error: getParkError } = await supabase
      .from("parks")
      .select("*")
      .single()
      .eq("park_operator_id", req.user.user_id);

    if (getParkError) {
      return res.status(500).json({ error: getParkError.message });
    }

    res
      .status(200)
      .json({ data: { ...getPark, user_name: req.user.user_name } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
