import { supabase } from "../lib/supabase.js";

export const addDriver = async (req, res) => {
  try {
    const { name, phone, email, license, years_of_experience } = req.body;
    const operatorId = req.user.user_id;

    const { data: driverExist, error: driverExistError } = await supabase
      .from("drivers")
      .select()
      .eq("phone", phone)
      .maybeSingle();

    if (driverExistError)
      return res.status(500).json({ error: driverExistError.message });

    if (driverExist) {
      return res.status(409).json({
        message: "Driver already exists",
      });
    }

    const { data: getParkId, error: getParkIdError } = await supabase
      .from("parks")
      .select("id")
      .eq("park_operator_id", operatorId)
      .maybeSingle();

    if (getParkIdError) {
      return res.status(500).json({ error: getParkIdError.message });
    }

    const { data: addDriver, error: addDriverError } = await supabase
      .from("drivers")
      .insert([
        {
          name: name,
          phone: phone,
          email: email,
          license: license,
          years_of_experience: years_of_experience,
          park_id: getParkId.id,
        },
      ])
      .select()
      .single();
    if (addDriverError) {
      return res.status(500).json({ error: addDriverError.message });
    }

    return res.status(201).json({
      message: "Driver added successfully",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getDriver = async (req, res) => {
  try {
    const operatorId = req.user.user_id;

    const { data: getParkId, error: getParkIdError } = await supabase
      .from("parks")
      .select("id")
      .eq("park_operator_id", operatorId)
      .maybeSingle();

    if (getParkIdError) {
      return res.status(500).json({ error: getParkIdError.message });
    }

    const { data: driverData, error: DriverError } = await supabase
      .from("drivers")
      .select("*")
      .eq("park_id", getParkId.id)
      .order("name", { ascending: true });

    if (DriverError)
      return res.status(500).json({ error: DriverError.message });

    res.status(200).json({ message: "success", data: driverData });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
