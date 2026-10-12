// Supabase로 가는 요청 하나를 보내는 전송입니다 — `api-client.ts`(인증 · 계정 · 푸시)와 `progress-api.ts`(학습 진행)가
// 같은 규칙(설정 확인 · 전송 해석 · 제한 시간 · 연결 실패 판정)을 씁니다. **어떤 경우에도 던지지 않습니다.**

import type {
  HttpRequestInit,
  HttpResponseLike,
  HttpTransport,
  SupabaseConfig,
} from "./auth-session.contract";
import { supabaseConfig } from "./supabase-config";

/** 응답이 이 안에 안 오면 `network`입니다. */
export const authRequestTimeoutMs = 10000;

/** 본문 없는 GET 전송 — 계약의 `HttpTransport`는 POST만 선언해 따로 둡니다. */
export type HttpGetTransport = (
  url: string,
  init: { readonly method: "GET"; readonly headers: Readonly<Record<string, string>> },
) => Promise<HttpResponseLike>;

// `globalThis.fetch` → `lynx.fetch` → 없음. 캐스팅은 `tsconfig`의 `lib`이 `ES2022`뿐이라
// DOM의 `fetch` · `RequestInit` 선언이 없어서입니다(`storage.ts`의 `NativeModules`와 같은 근거).
function resolveTransport(): (HttpTransport & HttpGetTransport) | undefined {
  const globalFetch = (globalThis as unknown as Record<string, unknown>)["fetch"];
  if (typeof globalFetch === "function") {
    return globalFetch as unknown as HttpTransport & HttpGetTransport;
  }
  if (typeof lynx !== "undefined" && typeof lynx.fetch === "function") {
    // 넘기는 값은 문자열 헤더 · 본문뿐(POST) 또는 헤더뿐(GET)이라 함수째 캐스팅합니다.
    return lynx.fetch.bind(lynx) as unknown as HttpTransport & HttpGetTransport;
  }
  return undefined;
}

export type AuthRequestOutcome =
  | { readonly ok: true; readonly status: number; readonly bodyText: string }
  | { readonly ok: false; readonly reason: "network" | "unconfigured" };

// 전송과 제한 시간의 경주 — `send`와 `sendGet`이 함께 씁니다. **어떤 경우에도 던지지 않습니다.**
async function raceRequest(
  call: () => Promise<HttpResponseLike>,
  readBody: boolean,
): Promise<AuthRequestOutcome> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<AuthRequestOutcome>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({ ok: false, reason: "network" });
    }, authRequestTimeoutMs);
  });

  const request = (async (): Promise<AuthRequestOutcome> => {
    try {
      const response = await call();
      // Lynx `fetch`는 연결 실패를 거부하지 않고 이 status로 돌려줍니다(#154 · ADR-0029 D12).
      if (response.status === 0 || response.status === 499) {
        return { ok: false, reason: "network" };
      }
      // 로그아웃 · 삭제는 상태 코드만 가르므로 본문을 읽지 않습니다.
      const bodyText = readBody ? await response.text() : "";
      return { ok: true, status: response.status, bodyText };
    } catch {
      return { ok: false, reason: "network" };
    }
  })();

  const outcome = await Promise.race([request, timeout]);
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
  }
  return outcome;
}

// 설정 확인 → 전송 함수 해석 → 전송과 제한 시간의 경주. **어떤 경우에도 던지지 않습니다.**
export async function send(
  build: (config: SupabaseConfig) => { url: string; init: HttpRequestInit },
  readBody: boolean,
): Promise<AuthRequestOutcome> {
  const config = supabaseConfig();
  if (config === null) {
    return { ok: false, reason: "unconfigured" };
  }

  const transport = resolveTransport();
  if (transport === undefined) {
    return { ok: false, reason: "network" };
  }

  const { url, init } = build(config);
  return raceRequest(() => transport(url, init), readBody);
}

export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/** GET 전용 전송 — `send`와 같은 설정 확인 · 전송 해석 · 제한 시간 · 연결 실패 판정이고 본문을 읽습니다. 던지지 않습니다. */
export async function sendGet(
  buildUrl: (config: SupabaseConfig) => string,
  headers: (config: SupabaseConfig) => Record<string, string>,
): Promise<AuthRequestOutcome> {
  const config = supabaseConfig();
  if (config === null) {
    return { ok: false, reason: "unconfigured" };
  }

  const transport = resolveTransport();
  if (transport === undefined) {
    return { ok: false, reason: "network" };
  }

  try {
    const url = buildUrl(config);
    const init = { method: "GET" as const, headers: headers(config) };
    return await raceRequest(() => transport(url, init), true);
  } catch {
    return { ok: false, reason: "network" };
  }
}
