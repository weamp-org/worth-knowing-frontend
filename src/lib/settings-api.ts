import api from "@/lib/api";
import type { MySettings } from "@/lib/resource-types";

/**
 * The caller's own settings.
 *
 * Goes through the shared `api` instance, so the Clerk JWT is attached —
 * unlike the resource reads, this route is not `@Public()`.
 */
export async function getMySettings(): Promise<MySettings> {
  const response = await api.get<MySettings>("/users/me/settings");

  return response.data;
}

/**
 * Updates the caller's own settings.
 *
 * The id is never sent — the backend takes it from the session, so there is no
 * value here that could name somebody else.
 */
export async function updateMySettings(
  patch: Partial<MySettings>,
): Promise<MySettings> {
  const response = await api.patch<MySettings>("/users/me/settings", patch);

  return response.data;
}
