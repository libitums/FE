// 웹 인증 창 접점입니다. 호스트 `WebAuthenticationModule`을 감쌉니다(ADR-0017 D3 —
// 모듈마다 파일 하나). 화면 · 흐름은 `NativeModules`를 직접 만지지 않습니다.

import type {
  WebAuthenticationModule,
  WebAuthenticationRequest,
  WebAuthenticationRequestOutcome,
  WebAuthenticationResult,
} from "./social-sign-in.contract";

const knownResultStatuses = [
  "completed",
  "cancelled",
  "failed",
  "already-active",
  "invalid-arguments",
] as const;

/** 문자열이고 길이가 정확히 `2 × byteCount`이고 `[0-9a-fA-F]`만일 때만 바이트로. */
export function bytesFromHex(value: unknown, byteCount: number): Uint8Array | null {
  if (byteCount < 1) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  if (value.length !== byteCount * 2) {
    return null;
  }
  if (!/^[0-9a-fA-F]+$/.test(value)) {
    return null;
  }

  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i += 1) {
    bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** 호스트 페이로드(`unknown`)를 `WebAuthenticationResult`로 좁힙니다. */
export function webAuthenticationResultFrom(payload: unknown): WebAuthenticationResult {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { status: "malformed" };
  }

  const status = (payload as Record<string, unknown>)["status"];
  if (typeof status !== "string" || !(knownResultStatuses as readonly string[]).includes(status)) {
    return { status: "malformed" };
  }

  if (status === "completed") {
    const callbackUrl = (payload as Record<string, unknown>)["callbackUrl"];
    if (typeof callbackUrl !== "string" || callbackUrl.length === 0) {
      return { status: "malformed" };
    }
    return { status: "completed", callbackUrl };
  }

  return { status } as WebAuthenticationResult;
}

// **`storage.ts`·`speech-recognition.ts`와 같은 형태입니다 — `typeof` 가드 + `null` 가드 +
// 모듈 값 `null` 정규화.**
function nativeModule(): WebAuthenticationModule | undefined {
  if (typeof NativeModules === "undefined") {
    return undefined;
  }
  if (NativeModules === null) {
    return undefined;
  }
  const module = (NativeModules as Record<string, unknown>)["WebAuthenticationModule"] as
    | WebAuthenticationModule
    | undefined;
  return module ?? undefined;
}

/** 모듈 유무입니다. 부수효과가 없습니다. */
export function isWebAuthenticationAvailable(): boolean {
  return nativeModule() !== undefined;
}

/** 모듈이 없으면 `unavailable`(콜백 0회). 있으면 `host.start`를 부르고 `requested`. */
export function startWebAuthentication(
  request: WebAuthenticationRequest,
  onResult: (result: WebAuthenticationResult) => void,
): WebAuthenticationRequestOutcome {
  const host = nativeModule();
  if (host === undefined) {
    return "unavailable";
  }

  try {
    host.start({ url: request.url, callbackScheme: request.callbackScheme }, (payload) =>
      onResult(webAuthenticationResultFrom(payload)),
    );
  } catch {
    return "unavailable";
  }

  return "requested";
}

/** 모듈이 없거나 `host.randomBytes`가 던지거나 모양이 아니면 `null`. */
export function secureRandomBytes(byteCount: number): Uint8Array | null {
  const host = nativeModule();
  if (host === undefined) {
    return null;
  }

  let raw: unknown;
  try {
    raw = host.randomBytes(byteCount);
  } catch {
    return null;
  }

  return bytesFromHex(raw, byteCount);
}
