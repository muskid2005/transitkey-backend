import { supabase } from "../lib/supabase.js";

export const addRoute = async (req, res) => {
  try {
    const { destination, standard_fare } = req.body;
    const operatorId = req.user.user_id;

    if (!destination || !standard_fare) {
      return res
        .status(400)
        .json({ message: "Destination and standard fare are required." });
    }

    const { data: parkData, error: parkError } = await supabase
      .from("parks")
      .select("id, state_located")
      .eq("park_operator_id", operatorId)
      .maybeSingle();

    if (parkError) return res.status(500).json({ error: parkError.message });
    if (!parkData)
      return res
        .status(404)
        .json({ message: "No park found for this operator." });

    if (
      destination.toLowerCase().trim() ===
      parkData.state_located.toLowerCase().trim()
    ) {
      return res.status(400).json({
        message: "Destination cannot be the same as your park's origin state.",
      });
    }

    const { data: newRoute, error: insertError } = await supabase
      .from("routes")
      .insert([
        {
          park_id: parkData.id,
          destination: destination.trim(),
          standard_fare: standard_fare,
        },
      ])
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return res.status(409).json({
          message: `A route to ${destination} already exists for your park.`,
        });
      }
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(201).json({
      message: "Route added successfully",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getRoutes = async (req, res) => {
  try {
    const operatorId = req.user.user_id;

    const { data: parkData, error: parkError } = await supabase
      .from("parks")
      .select("id, state_located")
      .eq("park_operator_id", operatorId)
      .maybeSingle();

    if (parkError) return res.status(500).json({ error: parkError.message });
    if (!parkData)
      return res
        .status(404)
        .json({ message: "No park found for this operator." });

    const { data: routes, error: routesError } = await supabase
      .from("routes")
      .select("*")
      .eq("park_id", parkData.id)
      .order("destination", { ascending: true });

    if (routesError)
      return res.status(500).json({ error: routesError.message });

    const localizedRoutes = routes.map((route) => ({
      ...route,
      origin: parkData.state_located,
    }));

    return res.status(200).json({
      count: localizedRoutes.length,
      routes: localizedRoutes,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateRoute = async (req, res) => {
  try {
    const { route_id, destination, standard_fare } = req.body;
    const operatorId = req.user.user_id;

    if (!route_id) {
      return res.status(400).json({ message: "Route ID is required." });
    }

    const { data: parkData, error: parkError } = await supabase
      .from("parks")
      .select("id, state_located")
      .eq("park_operator_id", operatorId)
      .maybeSingle();

    if (parkError) return res.status(500).json({ error: parkError.message });
    if (!parkData)
      return res
        .status(404)
        .json({ message: "No park found for this operator." });

    const updateData = {};
    if (destination) {
      if (
        destination.toLowerCase().trim() ===
        parkData.state_located.toLowerCase().trim()
      ) {
        return res.status(400).json({
          message:
            "Destination cannot be the same as your park's origin state.",
        });
      }
      updateData.destination = destination.trim();
    }
    if (standard_fare !== undefined) updateData.standard_fare = standard_fare;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedRoute, error: updateError } = await supabase
      .from("routes")
      .update(updateData)
      .eq("id", route_id)
      .eq("park_id", parkData.id)
      .select()
      .maybeSingle();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    if (!updatedRoute) {
      return res
        .status(404)
        .json({ message: "Route not found or unauthorized." });
    }

    return res.status(200).json({
      message: "Route updated successfully",
      route: {
        ...updatedRoute,
        origin: parkData.state_located,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
