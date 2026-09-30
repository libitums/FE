import type {
  AdminDeleteUserRequest,
  AuthUserRequest,
  AuthUserSummaryFrom,
  BearerTokenFrom,
} from "./delete-account.contract.ts";
import { serviceKeyHeaders } from "./service-key.ts";

export const bearerTokenFrom: BearerTokenFrom = (authorization) => {
  if (authorization === null) return null;
  const match = /^bearer\s+(\S+)$/i.exec(authorization.trim());
  return match?.[1] ?? null;
};

export const authUserRequest: AuthUserRequest = (env, accessToken) => ({
  url: `${env.supabaseUrl}/auth/v1/user`,
  method: "GET",
  headers: { apikey: env.supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
  body: null,
});

const nonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const authUserSummaryFrom: AuthUserSummaryFrom = (bodyText) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }
  const user = asRecord(parsed);
  const id = nonEmptyString(user?.["id"]);
  if (user === null || id === null) return null;

  const identities = Array.isArray(user["identities"]) ? (user["identities"] as unknown[]) : [];
  const appleIdentity = identities
    .map(asRecord)
    .find((identity) => identity !== null && identity["provider"] === "apple");
  if (appleIdentity === undefined || appleIdentity === null) return { id, apple: null };

  const subject =
    nonEmptyString(asRecord(appleIdentity["identity_data"])?.["sub"]) ??
    nonEmptyString(appleIdentity["id"]);
  return subject === null ? null : { id, apple: { subject } };
};

export const adminDeleteUserRequest: AdminDeleteUserRequest = (env, userId) => ({
  url: `${env.supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
  method: "DELETE",
  headers: serviceKeyHeaders(env.supabaseServiceRoleKey),
  body: null,
});
