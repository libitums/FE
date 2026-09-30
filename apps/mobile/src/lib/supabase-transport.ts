// Supabase로 가는 요청 하나를 보내는 전송입니다 — `api-client.ts`(인증 · 계정 · 푸시)와 `progress-api.ts`(학습 진행)가
// 같은 규칙(설정 확인 · 전송 해석 · 제한 시간 · 연결 실패 판정)을 씁니다. **어떤 경우에도 던지지 않습니다.**

import type { HttpRequestInit, HttpTransport, SupabaseConfig } from "./auth-session.contract";
import { supabaseConfig } from "./supabase-config";

/** 응답이 이 안에 안 오면 `network`입니다. */
export const authRequestTimeoutMs = 10000;

// `globalThis.fetch` → `lynx.fetch` → 없음. 캐스팅은 `tsconfig`의 `lib`이 `ES2022`뿐이라
// DOM의 `fetch` · `RequestInit` 선언이 없어서입니다(`storage.ts`의 `NativeModules`와 같은 근거).
function resolveTransport(): HttpTransport | undefined {
  const globalFetch = (globalThis as unknown as Record<string, unknown>)["fetch"];
  if (typeof globalFetch === "function") {
    return globalFetch as unknown as HttpTransport;
  }
  if (typeof lynx !== "undefined" && typeof lynx.fetch === "function") {
    // 넘기는 값은 계약의 `HttpRequestInit`(문자열 헤더 · 본문)뿐이라 함수째 캐스팅합니다.
    return lynx.fetch.bind(lynx) as unknown as HttpTransport;
  }
  return undefined;
}

export type AuthRequestOutcome =
  | { readonly ok: true; readonly status: number; readonly bodyText: string }
  | { readonly ok: false; readonly reason: "network" | "unconfigured" };

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

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<AuthRequestOutcome>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({ ok: false, reason: "network" });
    }, authRequestTimeoutMs);
  });

  const send = (async (): Promise<AuthRequestOutcome> => {
    try {
      const response = await transport(url, init);
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

  const outcome = await Promise.race([send, timeout]);
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
  }
  return outcome;
}

export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}
