import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Device ID — fallback for anonymous/offline use only
// Uses crypto.randomUUID() for cryptographically secure ID
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("glucolens_device_id");
  if (!id) {
    // Use crypto.randomUUID() if available (modern browsers), fallback to crypto.getRandomValues
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      id = "gl_" + crypto.randomUUID().replace(/-/g, "");
    } else {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      id = "gl_" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
    }
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
// Uses signed URLs — photos are private, not public
export async function uploadMealPhoto(base64: string, mealId: string): Promise<string | null> {
  try {
    const userId = await getUserId();
    if (!userId) return null; // Only upload for authenticated users

    const filename = `${userId}/${mealId}.jpg`;
    const blob = base64ToBlob(base64, "image/jpeg");

    const { error } = await supabase.storage
      .from("meal-photos")
      .upload(filename, blob, { upsert: true, contentType: "image/jpeg" });

    if (error) {
      if (process.env.NODE_ENV === "development") console.error("Photo upload error:", error);
      return null;
    }

    // Return signed URL (1 hour) instead of public URL
    const { data: signedData, error: signErr } = await supabase.storage
      .from("meal-photos")
      .createSignedUrl(filename, 3600);

    if (signErr || !signedData) return null;
    return signedData.signedUrl;
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error("uploadMealPhoto error:", err);
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
