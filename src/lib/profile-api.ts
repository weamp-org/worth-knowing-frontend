import api from "@/lib/api";
import type { Profile } from "@/lib/resource-types";

/**
 * Profile reads and writes.
 *
 * Every call goes through the shared `api` instance, for the reason
 * `resources-api.ts` documents: `AuthTokenSetter` installs the Clerk JWT
 * interceptor on that one instance, so anything else would be unauthenticated.
 *
 * `GET /users/:username` is `@Public()`, so a signed-out visitor can read a
 * profile. But passing no token on that route means the backend cannot tell an
 * owner apart from a stranger, and a private profile then 404s for its own owner
 * — hence `token` on {@link getProfile}.
 */
export async function getMyProfile(token?: string): Promise<Profile> {
  const response = await api.get<Profile>(
    "/users/me/profile",
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );

  return response.data;
}

/**
 * A public profile.
 *
 * Pass the Clerk token when there is one, so an owner opening their own private
 * profile gets it rather than a 404. Optional precisely because the route is
 * public.
 */
export async function getProfile(
  username: string,
  token?: string,
): Promise<Profile> {
  const response = await api.get<Profile>(
    `/users/${encodeURIComponent(username)}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );

  return response.data;
}

/**
 * Updates the caller's own profile.
 *
 * The id is never sent — the backend takes it from the session, so there is no
 * value here that could name somebody else. A field left out of `patch` is left
 * unchanged, which is what makes a bio-only edit safe: it cannot clear a claimed
 * username.
 */
export async function updateMyProfile(
  patch: Partial<{
    username: string;
    bio: string;
    isProfilePrivate: boolean;
  }>,
): Promise<Profile> {
  const response = await api.patch<Profile>("/users/me/profile", patch);

  return response.data;
}
