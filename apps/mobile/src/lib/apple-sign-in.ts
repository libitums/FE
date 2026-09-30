// 네이티브 Sign in with Apple의 JS 접점입니다. 호스트 `AppleSignInModule` 하나를 감싸고, 페이로드를
// 좁히고, nonce 한 쌍을 만듭니다. 계약은 `apple-sign-in.contract.ts`입니다(ADR-0028).

import type {
  AppleNoncePair,
  AppleSignInModule,
  AppleSignInRequest,
  AppleSignInRequestOutcome,
  AppleSignInResult,
} from "./apple-sign-in.contract";
import { asciiBytesFrom, base64UrlFromBytes, sha256 } from "./pkce";

/** nonce 원본의 난수 바이트 수입니다(base64url 43자). */
export const appleNonceByteCount = 32;

const hexDigits = "0123456789abcdef";

/** `sha256(ASCII 바이트)`의 소문자 16진입니다. 늘 64자입니다. */
export function appleNonceHashFor(raw: string): string {
  const digest = sha256(asciiBytesFrom(raw));
  let hex = "";
  for (const byte of digest) {
    hex += hexDigits[byte >> 4];
    hex += hexDigits[byte & 0x0f];
  }
  return hex;
}

/** `raw = base64UrlFromBytes(bytes)` · `hashed = appleNonceHashFor(raw)`. */
export function appleNoncePairFrom(bytes: Uint8Array): AppleNoncePair {
  const raw = base64UrlFromBytes(bytes);
  return { raw, hashed: appleNonceHashFor(raw) };
}

/** 브리지를 건너온 페이로드를 좁힙니다. 모르는 키는 버리고, 던지지 않습니다. */
export function appleSignInResultFrom(payload: unknown): AppleSignInResult {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { status: "malformed" };
  }
  const record = payload as Record<string, unknown>;
  switch (record["status"]) {
    case "completed": {
      const identityToken = record["identityToken"];
      if (typeof identityToken !== "string" || identityToken.length === 0) {
        return { status: "malformed" };
      }
      const code = record["authorizationCode"];
      const authorizationCode = typeof code === "string" && code.length > 0 ? code : null;
      return { status: "completed", identityToken, authorizationCode };
    }
    case "cancelled": {
      return { status: "cancelled" };
    }
    case "failed": {
      return { status: "failed" };
    }
    case "already-active": {
      return { status: "already-active" };
    }
    case "invalid-arguments": {
      return { status: "invalid-arguments" };
    }
    default: {
      return { status: "malformed" };
    }
  }
}

// `NativeModules`가 없거나 `null`이거나 모듈이 없으면 `undefined`입니다(`web-authentication.ts`와 같은 가드).
function appleSignInModule(): AppleSignInModule | undefined {
  if (typeof NativeModules === "undefined" || NativeModules === null) {
    return undefined;
  }
  const module = (NativeModules as unknown as Record<string, unknown>)["AppleSignInModule"];
  if (module === undefined || module === null) {
    return undefined;
  }
  return module as AppleSignInModule;
}

/**
 * 시트를 엽니다. 모듈이 없으면 `unavailable`이고 콜백은 0회입니다. 있으면 호스트에 키 하나(`nonce`)만
 * 넘기고 `requested`입니다. 결과는 콜백으로 정확히 한 번 옵니다.
 */
export function startAppleSignIn(
  request: AppleSignInRequest,
  onResult: (result: AppleSignInResult) => void,
): AppleSignInRequestOutcome {
  const host = appleSignInModule();
  if (host === undefined) {
    return "unavailable";
  }
  try {
    host.start({ nonce: request.nonce }, (payload) => {
      onResult(appleSignInResultFrom(payload));
    });
  } catch {
    return "unavailable";
  }
  return "requested";
}
