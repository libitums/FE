// AdMob SSV 콜백 — 쿼리 읽기 · 서명 확인 · 공개키 캐시 · 환경 값(ADR-0208). 런타임 중립(WebCrypto · fetch 대신 Outbound).
// 서명: ECDSA P-256 · SHA-256, 대상은 쿼리에서 `&signature=` 앞까지의 받은 글자 그대로, 서명 값은 base64url DER.
// 공개키: https://www.gstatic.com/admob/reward/verifier-keys.json 의 `keys[].base64`(SPKI DER) — key_id로 고른다.

import { bytesFromBase64, bytesFromBase64Url } from "./base64.ts";
import type {
  AdmobSsvEnvFrom,
  CreateAdmobKeys,
  ParseAdmobSsvQuery,
  VerifyAdmobSignature,
} from "./admob-ssv.contract.ts";

export const admobVerifierKeysUrl = "https://www.gstatic.com/admob/reward/verifier-keys.json";
const dayMs = 24 * 60 * 60 * 1000;

function decodeValue(value: string): string | null {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return null;
  }
}

export const parseAdmobSsvQuery: ParseAdmobSsvQuery = (rawQuery) => {
  const cut = rawQuery.indexOf("&signature=");
  if (cut <= 0) return null;
  const tail = rawQuery.slice(cut + 1).split("&");
  if (tail.length !== 2 || !tail[1]!.startsWith("key_id=")) return null;
  const signature = tail[0]!.slice("signature=".length);
  const keyId = decodeValue(tail[1]!.slice("key_id=".length));
  const signedContent = rawQuery.slice(0, cut);
  const values = new Map<string, string>();
  for (const pair of signedContent.split("&")) {
    const at = pair.indexOf("=");
    if (at <= 0) continue;
    const value = decodeValue(pair.slice(at + 1));
    if (value !== null) values.set(pair.slice(0, at), value);
  }
  const adUnit = values.get("ad_unit") ?? "";
  const customData = values.get("custom_data") ?? "";
  const transactionId = values.get("transaction_id") ?? "";
  const userId = values.get("user_id") ?? "";
  if (!signature || !keyId || !adUnit || !customData || !transactionId || !userId) return null;
  return { adUnit, customData, keyId, transactionId, userId, signature, signedContent };
};

/** DER SEQUENCE{INTEGER r, INTEGER s} → r‖s(각 32바이트). 모양이 틀리면 null. */
function rawFromDer(der: Uint8Array): Uint8Array<ArrayBuffer> | null {
  if (der.length < 8 || der[0] !== 0x30 || der[1] !== der.length - 2) return null;
  const out = new Uint8Array(64);
  let at = 2;
  for (const offset of [0, 32]) {
    if (der[at] !== 0x02) return null;
    const length = der[at + 1]!;
    let value = der.slice(at + 2, at + 2 + length);
    if (value.length !== length || length === 0) return null;
    while (value.length > 32 && value[0] === 0) value = value.slice(1);
    if (value.length > 32) return null;
    out.set(value, offset + 32 - value.length);
    at += 2 + length;
  }
  return at === der.length ? out : null;
}

export const verifyAdmobSignature: VerifyAdmobSignature = async (
  signedContent,
  signature,
  publicKeyBase64,
) => {
  const der = bytesFromBase64Url(signature.replace(/=+$/, ""));
  const spki = bytesFromBase64(publicKeyBase64);
  const raw = der === null ? null : rawFromDer(der);
  if (raw === null || spki === null) return false;
  try {
    const key = await crypto.subtle.importKey(
      "spki",
      new Uint8Array(spki),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      raw,
      new TextEncoder().encode(signedContent),
    );
  } catch {
    return false;
  }
};

function keysFrom(text: string): Map<string, string> {
  const body = JSON.parse(text) as { keys?: unknown };
  if (!Array.isArray(body.keys)) throw new Error("admob keys: bad shape");
  const map = new Map<string, string>();
  for (const entry of body.keys as { keyId?: unknown; base64?: unknown }[]) {
    if (
      (typeof entry?.keyId === "number" || typeof entry?.keyId === "string") &&
      typeof entry.base64 === "string"
    ) {
      map.set(String(entry.keyId), entry.base64);
    }
  }
  return map;
}

export const createAdmobKeys: CreateAdmobKeys = ({
  outbound,
  nowMs,
  url = admobVerifierKeysUrl,
  ttlMs = dayMs,
  minReloadMs = 60_000,
}) => {
  let cache: { keys: Map<string, string>; at: number } | null = null;
  const load = async () => {
    const response = await outbound({ url, method: "GET", headers: {}, body: null });
    if (response.status !== 200) throw new Error(`admob keys: ${response.status}`);
    cache = { keys: keysFrom(await response.text()), at: nowMs() };
    return cache.keys;
  };
  return {
    keyFor: async (keyId) => {
      const fresh = cache !== null && nowMs() - cache.at <= ttlMs;
      const keys = fresh ? cache!.keys : await load();
      if (keys.has(keyId)) return keys.get(keyId)!;
      // Google이 키를 바꿨을 수 있다 — 방금 읽은 것이 아니면 한 번 더 읽는다.
      if (!fresh || nowMs() - cache!.at < minReloadMs) return null;
      return (await load()).get(keyId) ?? null;
    },
  };
};

export const admobSsvEnvFrom: AdmobSsvEnvFrom = (read) => {
  const value = (name: Parameters<typeof read>[0]) => {
    const trimmed = read(name)?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  };
  const rawUrl = value("SUPABASE_URL");
  const supabaseServiceRoleKey = value("SUPABASE_SERVICE_ROLE_KEY");
  if (rawUrl === null || supabaseServiceRoleKey === null || !rawUrl.startsWith("https://")) {
    return null;
  }
  const units = (value("ADMOB_AD_UNIT_IDS") ?? "")
    .split(",")
    .map((unit) => unit.trim())
    .filter((unit) => unit !== "");
  return {
    supabaseUrl: rawUrl.replace(/\/+$/, ""),
    supabaseServiceRoleKey,
    adUnitIds: units.length > 0 ? units : null,
  };
};
