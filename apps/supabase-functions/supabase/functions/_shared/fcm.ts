import { pemToPkcs8 } from "./apple-client-secret.ts";
import { base64UrlFromBytes, bytesFromBase64Url, utf8Bytes } from "./base64.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";
import type { PushMessage } from "./send-push.contract.ts";

export type FcmServiceAccount = {
  readonly projectId: string;
  readonly clientEmail: string;
  readonly privateKeyPem: string;
};

const storedTokenPattern = /^fcm\.([A-Za-z0-9_-]{27,4096})$/;

/** The database token is URL safe even when the original FCM token is opaque. */
export function fcmStoredTokenFrom(raw: string): string | null {
  const bytes = utf8Bytes(raw);
  if (bytes.length < 20 || bytes.length > 3072 || /[\x00-\x1f\x7f]/.test(raw)) return null;
  const stored = `fcm.${base64UrlFromBytes(bytes)}`;
  return storedTokenPattern.test(stored) ? stored : null;
}

export function fcmRawTokenFrom(stored: string): string | null {
  const encoded = storedTokenPattern.exec(stored)?.[1];
  if (encoded === undefined) return null;
  const bytes = bytesFromBase64Url(encoded);
  if (bytes === null || bytes.length < 20 || bytes.length > 3072) return null;
  try {
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return fcmStoredTokenFrom(raw) === stored ? raw : null;
  } catch {
    return null;
  }
}

export function fcmServiceAccountFrom(json: string): FcmServiceAccount | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const projectId = record["project_id"];
  const clientEmail = record["client_email"];
  const privateKeyPem = record["private_key"];
  if (
    typeof projectId !== "string" ||
    !/^[a-z][a-z0-9-]{4,29}$/.test(projectId) ||
    typeof clientEmail !== "string" ||
    !/^[^\s@]+@[^\s@]+$/.test(clientEmail) ||
    typeof privateKeyPem !== "string" ||
    privateKeyPem.trim() === ""
  )
    return null;
  return { projectId, clientEmail, privateKeyPem };
}

const encodeJson = (value: unknown): string => base64UrlFromBytes(utf8Bytes(JSON.stringify(value)));

/** RS256 service account assertion, valid for one hour. */
export async function fcmAssertion(
  account: FcmServiceAccount,
  nowMs: number,
): Promise<string | null> {
  const der = pemToPkcs8(account.privateKeyPem);
  if (der === null) return null;
  const iat = Math.floor(nowMs / 1000);
  const input = `${encodeJson({ alg: "RS256", typ: "JWT" })}.${encodeJson({
    iss: account.clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat,
    exp: iat + 3600,
  })}`;
  try {
    const key = await crypto.subtle.importKey(
      "pkcs8",
      der as Uint8Array<ArrayBuffer>,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      utf8Bytes(input) as Uint8Array<ArrayBuffer>,
    );
    return `${input}.${base64UrlFromBytes(new Uint8Array(signature))}`;
  } catch {
    return null;
  }
}

export function fcmOauthRequest(assertion: string): OutboundRequest {
  return {
    url: "https://oauth2.googleapis.com/token",
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  };
}

export function fcmAccessTokenFrom(status: number, bodyText: string): string | null {
  if (status !== 200) return null;
  try {
    const body = JSON.parse(bodyText) as Record<string, unknown>;
    return typeof body["access_token"] === "string" &&
      body["access_token"] !== "" &&
      body["token_type"] === "Bearer"
      ? body["access_token"]
      : null;
  } catch {
    return null;
  }
}

export function fcmRequest(
  account: FcmServiceAccount,
  accessToken: string,
  storedToken: string,
  message: PushMessage,
): OutboundRequest | null {
  const token = fcmRawTokenFrom(storedToken);
  if (token === null) return null;
  return {
    url: `https://fcm.googleapis.com/v1/projects/${account.projectId}/messages:send`,
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: message.title, body: message.body },
        data: { target: JSON.stringify(message.target) },
        android: { notification: { channel_id: "duru-updates" } },
      },
    }),
  };
}

export function fcmResultFrom(
  status: number,
  bodyText: string,
): "sent" | "invalid-token" | "failed" {
  if (status >= 200 && status < 300) return "sent";
  if (status === 404) {
    try {
      const body = JSON.parse(bodyText) as { error?: { details?: Array<{ errorCode?: unknown }> } };
      if (body.error?.details?.some((detail) => detail.errorCode === "UNREGISTERED")) {
        return "invalid-token";
      }
    } catch {
      // Unknown response is not grounds to remove the registration.
    }
  }
  return "failed";
}
