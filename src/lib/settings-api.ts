import api from "@/lib/api";
import type { MySettings } from "@/lib/resource-types";

/**
 * The caller's own settings.
 *
 * This route is **not** `@Public()`, so it needs the Clerk JWT. In the browser
 * the shared `api` instance attaches it automatically; in a Server Component
 * the interceptor is never installed, so a server-side call has to carry the
 * token explicitly. Passing nothing here 401s and looks like a setting of
 * `false`.
 */
export async function getMySettings(token?: string): Promise<MySettings> {
  const response = await api.get<MySettings>(
    "/users/me/settings",
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );

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
