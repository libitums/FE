// AdMob SSV 테스트 도우미 — 시험용 P-256 키로 Google처럼 서명한 콜백 쿼리를 만듭니다(ADR-0208).
// Google은 서명을 DER(ASN.1 SEQUENCE{r, s})로 싣고 WebCrypto는 r‖s(64바이트)를 내므로 여기서 DER로 감쌉니다.

import { base64FromBytes, base64UrlFromBytes } from "./base64.ts";

function derInteger(bytes: Uint8Array): number[] {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start += 1;
  const body = Array.from(bytes.slice(start));
  if ((body[0] ?? 0) & 0x80) body.unshift(0);
  return [0x02, body.length, ...body];
}

export function derFromRaw(raw: Uint8Array): Uint8Array {
  const r = derInteger(raw.slice(0, 32));
  const s = derInteger(raw.slice(32));
  return new Uint8Array([0x30, r.length + s.length, ...r, ...s]);
}

export async function testSigner() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const publicKeyBase64 = base64FromBytes(spki);
  const sign = async (content: string) =>
    base64UrlFromBytes(
      derFromRaw(
        new Uint8Array(
          await crypto.subtle.sign(
            { name: "ECDSA", hash: "SHA-256" },
            pair.privateKey,
            new TextEncoder().encode(content),
          ),
        ),
      ),
    );
  return { publicKeyBase64, sign };
}

export type SsvFields = {
  adUnit?: string;
  customData?: string;
  transactionId?: string;
  userId?: string;
  keyId?: string;
};

/** Google 순서 그대로의 쿼리(서명 · key_id가 끝)를 만듭니다. `tamper`는 서명 뒤 값을 바꿉니다(위조). */
export async function signedQuery(
  sign: (content: string) => Promise<string>,
  fields: SsvFields,
  tamper?: (content: string) => string,
): Promise<string> {
  const pairs: [string, string | undefined][] = [
    ["ad_network", "5450213213286189855"],
    ["ad_unit", fields.adUnit ?? "1234567890"],
    ["custom_data", fields.customData],
    ["reward_amount", "1"],
    ["reward_item", "ticket"],
    ["timestamp", "1795762032000"],
    ["transaction_id", fields.transactionId ?? "tx-0001"],
    ["user_id", fields.userId],
  ];
  const content = pairs
    .filter((pair): pair is [string, string] => pair[1] !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  const signature = await sign(content);
  const sent = tamper ? tamper(content) : content;
  return `${sent}&signature=${signature}&key_id=${fields.keyId ?? "3335741209"}`;
}

export const keysJson = (keyId: string, base64: string) =>
  JSON.stringify({ keys: [{ keyId: Number(keyId), pem: "unused", base64 }] });
