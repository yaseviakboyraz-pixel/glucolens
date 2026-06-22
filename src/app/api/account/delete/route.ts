import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Apple Guideline 5.1.1(v): apps that support account creation MUST offer
// in-app account deletion. This route permanently deletes a user's auth
// account, all their database rows, and their stored meal photos.
//
// SECURITY: uses the Supabase service_role key (full admin, bypasses RLS).
// This key MUST only ever live in a server-side env var — never NEXT_PUBLIC,
// never shipped to the client.

export const maxDuration = 30;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const OWNED_TABLES = ["meals", "water_logs", "activity_logs", "profiles"];

export async function POST(req: NextRequest) {
  try {
    if (!SERVICE_ROLE_KEY) {
      if (process.env.NODE_ENV === "development") {
        console.error("[account/delete] SUPABASE_SERVICE_ROLE_KEY is not configured");
      }
      return NextResponse.json(
        { error: "Account deletion is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Identify the authenticated user (if any) from the bearer token
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    let userId: string | null = null;
    if (token) {
      const anon = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await anon.auth.getUser(token);
      if (!error && data.user) userId = data.user.id;
    }

    // Anonymous users own data by device_id
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const deviceId =
      typeof (body as { deviceId?: unknown }).deviceId === "string"
        ? (body as { deviceId: string }).deviceId
        : undefined;

    if (!userId && !deviceId) {
      return NextResponse.json(
        { error: "No account or device identifier provided." },
        { status: 400 }
      );
    }

    // 1. Delete all owned database rows (by user_id and/or device_id)
    for (const table of OWNED_TABLES) {
      if (userId) await admin.from(table).delete().eq("user_id", userId);
      if (deviceId) await admin.from(table).delete().eq("device_id", deviceId);
    }

    // 2. Delete stored meal photos (authenticated users only — stored under {userId}/)
    if (userId) {
      const { data: files } = await admin.storage.from("meal-photos").list(userId);
      if (files && files.length > 0) {
        await admin.storage
          .from("meal-photos")
          .remove(files.map((f) => `${userId}/${f.name}`));
      }

      // 3. Finally, delete the auth account itself
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) throw delErr;
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[account/delete]", err instanceof Error ? err.message : String(err));
    }
    return NextResponse.json(
      { error: "Account deletion failed. Please try again or contact privacy@glucolens.app." },
      { status: 500 }
    );
  }
}
