import { supabase } from "../lib/supabase.js";
import { codeGenerator } from "../utils/codeGenerator.js";

export const refrenceCode = async (req, res) => {
  const { data: codeData, error: codeError } = await supabase
    .from("refrence_code")
    .insert([
      {
        created_by: req.user.user_id,
        creator_name: req.user.user_name,
        code: codeGenerator(),
        is_used: false,
      },
    ])
    .select("code")
    .single();

  if (codeError) {
    return res.status(500).json({ error: codeError.message });
  }

  res.status(201).json({
    code: codeData.code,
  });
};
