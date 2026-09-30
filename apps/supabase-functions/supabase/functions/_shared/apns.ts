import { pemToPkcs8 } from "./apple-client-secret.ts";
import { base64UrlFromBytes, utf8Bytes } from "./base64.ts";
import type { OutboundRequest, SignEs256 } from "./delete-account.contract.ts";
import type {
  ApnsResultFrom,
  PushEnvironment,
  PushMessage,
  SendPushEnv,
} from "./send-push.contract.ts";

// APNs HTTP/2 API입니다(토큰 기반 인증). 인증 JWT는 요청마다가 아니라 **발송 한 번**에 하나 만듭니다 —
// Apple은 20분 안의 재사용을 권하고, 한 번의 발송은 그보다 짧습니다.

export const apnsHosts: Readonly<Record<PushEnvironment, string>> = {
  sandbox: "https://api.sandbox.push.apple.com",
  production: "https://api.push.apple.com",
};

/** 동시에 보내는 요청 수입니다. */
export const apnsConcurrency = 20;

const encodeJson = (value: unknown): string => base64UrlFromBytes(utf8Bytes(JSON.stringify(value)));

/** `{alg: ES256, kid}` · `{iss: teamId, iat}` JWT입니다. PEM · 서명 실패는 `null`. */
export async function apnsAuthToken(
  apns: SendPushEnv["apns"],
  nowMs: number,
  sign: SignEs256,
): Promise<string | null> {
  const der = pemToPkcs8(apns.privateKeyPem);
  if (der === null) return null;
  const input = `${encodeJson({ alg: "ES256", kid: apns.keyId })}.${encodeJson({
    iss: apns.teamId,
    iat: Math.floor(nowMs / 1000),
  })}`;
  const signature = await sign(der, input);
  if (signature === null) return null;
  return `${input}.${base64UrlFromBytes(signature)}`;
}

/** 알림 본문입니다. `target`은 `aps` 밖 최상위 키로 싣습니다 — 호스트가 그 자리를 읽습니다. */
export function apnsPayload(message: PushMessage): string {
  return JSON.stringify({
    aps: { alert: { title: message.title, body: message.body }, sound: "default" },
    target: message.target,
  });
}

export function apnsRequest(
  apns: SendPushEnv["apns"],
  authToken: string,
  device: { readonly token: string; readonly environment: PushEnvironment },
  payload: string,
): OutboundRequest {
  return {
    url: `${apnsHosts[device.environment]}/3/device/${device.token}`,
    method: "POST",
    headers: {
      authorization: `bearer ${authToken}`,
      "apns-topic": apns.topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: payload,
  };
}

const invalidTokenReasons = new Set(["BadDeviceToken", "DeviceTokenNotForTopic", "Unregistered"]);

export const apnsResultFrom: ApnsResultFrom = (status, bodyText) => {
  if (status === 200) return "sent";
  if (status === 410) return "invalid-token";
  if (status === 400) {
    try {
      const reason = (JSON.parse(bodyText) as { reason?: unknown }).reason;
      if (typeof reason === "string" && invalidTokenReasons.has(reason)) return "invalid-token";
    } catch {
      // 본문을 못 읽으면 실패로 둡니다.
    }
  }
  return "failed";
};
