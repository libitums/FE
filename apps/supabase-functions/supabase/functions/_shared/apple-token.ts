import { bytesFromBase64Url } from "./base64.ts";
import type {
  AppleRevokeEndpoint,
  AppleRevokeRequest,
  AppleTokenEndpoint,
  AppleTokenExchangeFrom,
  AppleTokenRequest,
} from "./delete-account.contract.ts";

export const appleTokenEndpoint: AppleTokenEndpoint = "https://appleid.apple.com/auth/token";
export const appleRevokeEndpoint: AppleRevokeEndpoint = "https://appleid.apple.com/auth/revoke";

const formHeaders = { "Content-Type": "application/x-www-form-urlencoded" } as const;

/** 키 · 값을 각각 `encodeURIComponent`하고 `=` · `&`로 잇습니다. 순서를 보존합니다. */
export function formBody(fields: ReadonlyArray<readonly [string, string]>): string {
  return fields
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

export const appleTokenRequest: AppleTokenRequest = (config, clientSecret, authorizationCode) => ({
  url: appleTokenEndpoint,
  method: "POST",
  headers: formHeaders,
  body: formBody([
    ["client_id", config.clientId],
    ["client_secret", clientSecret],
    ["code", authorizationCode],
    ["grant_type", "authorization_code"],
  ]),
});

export const appleRevokeRequest: AppleRevokeRequest = (config, clientSecret, refreshToken) => ({
  url: appleRevokeEndpoint,
  method: "POST",
  headers: formHeaders,
  body: formBody([
    ["client_id", config.clientId],
    ["client_secret", clientSecret],
    ["token", refreshToken],
    ["token_type_hint", "refresh_token"],
  ]),
});

function parseObject(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** JWT payload의 `sub`입니다. 서명을 검증하지 않습니다. 읽을 수 없으면 `null`. */
export function jwtSubjectFrom(jwt: string): string | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  const bytes = bytesFromBase64Url(parts[1]!);
  if (bytes === null) return null;
  const payload = parseObject(new TextDecoder().decode(bytes));
  const sub = payload?.["sub"];
  return typeof sub === "string" && sub !== "" ? sub : null;
}

export const appleTokenExchangeFrom: AppleTokenExchangeFrom = (bodyText) => {
  const body = parseObject(bodyText);
  const refreshToken = body?.["refresh_token"];
  if (typeof refreshToken !== "string" || refreshToken === "") return null;
  const idToken = body?.["id_token"];
  return {
    refreshToken,
    subject: typeof idToken === "string" ? jwtSubjectFrom(idToken) : null,
  };
};
