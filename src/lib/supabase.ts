import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Device ID — fallback for anonymous/offline use only
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("glucolens_device_id");
  if (!id) {
    id = "gl_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("glucolens_device_id", id);
  }
  return id;
}

// Get authenticated user ID — preferred over device_id
export async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// Returns user_id if logged in, device_id as fallback
export async function getOwnerId(): Promise<{ userId: string | null; deviceId: string; isAuthenticated: boolean }> {
  const userId = await getUserId();
  return {
    userId,
    deviceId: getDeviceId(),
    isAuthenticated: !!userId,
  };
}

// Upload meal photo to Supabase Storage
export async function uploadMealPhoto(base64: string, mealId: string): Promise<string | null> {
  try {
    const userId = await getUserId();
    if (!userId) return null; // Only upload for authenticated users

    const folder = userId;
    const filename = `${folder}/${mealId}.jpg`;
    const blob = base64ToBlob(base64, "image/jpeg");

    const { error } = await supabase.storage
      .from("meal-photos")
      .upload(filename, blob, { upsert: true, contentType: "image/jpeg" });

    if (error) {
      console.error("Photo upload error:", error);
      return null;
    }

    const { data } = supabase.storage.from("meal-photos").getPublicUrl(filename);
    return data.publicUrl;
  } catch (err) {
    console.error("uploadMealPhoto error:", err);
    return null;
  }
}

// Get signed URL for a meal photo
export async function getMealPhotoUrl(mealId: string): Promise<string | null> {
  try {
    const userId = await getUserId();
    if (!userId) return null;

    const { data, error } = await supabase.storage
      .from("meal-photos")
      .createSignedUrl(`${userId}/${mealId}.jpg`, 3600); // 1 hour

    if (error) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64.replace(/^data:image\/\w+;base64,/, ""));
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}
