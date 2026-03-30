import type { RoleKey } from "@/lib/domain";

export type PortalSessionScope = Extract<RoleKey, "candidate" | "admin">;

const SUPABASE_PORTAL_COOKIE_NAMES: Record<PortalSessionScope, string> = {
  candidate: "niural_candidate_auth_token",
  admin: "niural_admin_auth_token",
};

const ACTIVE_PORTAL_ROLE_COOKIE_NAMES: Record<PortalSessionScope, string> = {
  candidate: "niural_candidate_portal_role",
  admin: "niural_admin_portal_role",
};

export function resolvePortalSessionScope(role: RoleKey): PortalSessionScope {
  return role === "admin" ? "admin" : "candidate";
}

export function getSupabaseCookieName(scope: PortalSessionScope) {
  return SUPABASE_PORTAL_COOKIE_NAMES[scope];
}

export function getPortalRoleCookieName(scope: PortalSessionScope) {
  return ACTIVE_PORTAL_ROLE_COOKIE_NAMES[scope];
}
