import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generate or get persistent device ID
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("glucolens_device_id");
  if (!id) {
    id = "gl_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("glucolens_device_id", id);
  }
  return id;
}
