import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { googleAccessToken } from "@/lib/server/workspace";
import { listAccounts, listLocations } from "@/lib/server/google";

/**
 * GET /api/google/locations, auto-discover the locations the connected
 * Google account manages, for the Settings location picker.
 */
export async function GET() {
  try {
    const userId = await requireUserId();
    const resolved = await googleAccessToken(userId);
    if (!resolved?.token) {
      return NextResponse.json(
        { error: "No live Google connection. Connect with Google (or paste an OAuth token) first." },
        { status: 400 },
      );
    }
    const accounts = await listAccounts(resolved.token);
    const locations: Array<{ name: string; title: string; address: string; account: string }> = [];
    const failures: string[] = [];
    for (const account of accounts.slice(0, 10)) {
      try {
        const locs = await listLocations(resolved.token, account.name);
        for (const l of locs) locations.push({ ...l, account: account.accountName });
      } catch (err) {
        failures.push(`${account.accountName}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return NextResponse.json({ ok: true, locations, failures });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("location discovery failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not list locations." },
      { status: 502 },
    );
  }
}
