import { base64UrlFromBytes, bytesFromBase64, utf8Bytes } from "./base64.ts";
import type {
  AppleClientConfig,
  AppleClientSecretClaims,
  AppleClientSecretFor,
  JwtSigningInput,
  PemToPkcs8,
  SignEs256,
} from "./delete-account.contract.ts";

const pemBegin = "-----BEGIN PRIVATE KEY-----";
const pemEnd = "-----END PRIVATE KEY-----";

export const pemToPkcs8: PemToPkcs8 = (pem) => {
  const text = pem.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
  const start = text.indexOf(pemBegin);
  if (start < 0) return null;
  const from = start + pemBegin.length;
  const stop = text.indexOf(pemEnd, from);
  if (stop < 0) return null;
  const body = text.slice(from, stop).replace(/\s+/g, "");
  if (body === "") return null;
  const der = bytesFromBase64(body);
  return der === null || der.length === 0 ? null : der;
};

export const jwtSigningInput: JwtSigningInput = (header, claims) =>
  `${base64UrlFromBytes(utf8Bytes(JSON.stringify(header)))}.${base64UrlFromBytes(
    utf8Bytes(JSON.stringify(claims)),
  )}`;

/** `iat = ⌊nowMs / 1000⌋`, `exp = iat + 300`. */
export function appleClientSecretClaims(
  config: Pick<AppleClientConfig, "teamId" | "clientId">,
  nowMs: number,
): AppleClientSecretClaims {
  const iat = Math.floor(nowMs / 1000);
  return {
    iss: config.teamId,
    iat,
    exp: iat + 300,
    aud: "https://appleid.apple.com",
    sub: config.clientId,
  };
}

export const signEs256: SignEs256 = async (pkcs8, signingInput) => {
  try {
    const key = await crypto.subtle.importKey(
      "pkcs8",
      pkcs8 as Uint8Array<ArrayBuffer>,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      utf8Bytes(signingInput) as Uint8Array<ArrayBuffer>,
    );
    return new Uint8Array(signature);
  } catch {
    return null;
  }
};

export const appleClientSecretFor: AppleClientSecretFor = async (config, nowMs, sign) => {
  const der = pemToPkcs8(config.privateKeyPem);
  if (der === null) return null;
  const input = jwtSigningInput(
    { alg: "ES256", kid: config.keyId },
    appleClientSecretClaims(config, nowMs),
  );
  const signature = await sign(der, input);
  if (signature === null) return null;
  return `${input}.${base64UrlFromBytes(signature)}`;
};
