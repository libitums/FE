// integration 테스트를 로그인된 설치로 부팅하는 공용 헬퍼입니다. 제품 코드가 import하지 않습니다
// (번들에 들어가지 않습니다). 이름에 `.test.`를 넣지 않습니다 — vitest가 테스트 파일로 모읍니다.
//
// 이 헬퍼는 스스로 풀지 않습니다. 쓰는 파일의 `afterEach`가 `vi.unstubAllGlobals()`와
// `vi.unstubAllEnvs()`를 함께 부릅니다.

import { vi } from "vitest";
import { act, render, screen } from "@lynx-js/react/testing-library";

import type { AuthSession } from "../../lib/auth-session.contract";
import { authSessionStorageKey, serializeAuthSession } from "../../lib/auth-session";
import { entrySplashDurationMs } from "../../lib/entry-flow";

/** `StorageModule` 대역의 모양입니다. */
export type StorageModuleDouble = {
  readonly get: (key: string) => string | null;
  readonly set: (key: string, value: string) => void;
  readonly remove: (key: string) => void;
};

/** 부팅에 심는 세션입니다. 값은 픽스처이고 서버 자격이 아닙니다. */
export const signedInBootSession: AuthSession = {
  accessToken: "boot-access-token",
  refreshToken: "boot-refresh-token",
  expiresAt: 4_102_444_800_000,
};

// 갱신 응답 본문입니다 — `authSessionFrom`이 읽는 모양입니다. 기본 액세스 토큰은 JWT가 아니라
// 분석 사용자 식별이 일어나지 않습니다 — 식별을 보려는 자리가 JWT 모양 토큰을 넘깁니다.
function refreshedSessionBodyFor(accessToken: string): string {
  return JSON.stringify({
    access_token: accessToken,
    refresh_token: "refreshed-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: "boot-user" },
  });
}

/**
 * 로그인된 설치로 App을 부팅해 스플래시 · 세션 갱신을 지난 상태까지 흘립니다.
 * `NativeModules`를 지우지 않고 `StorageModule`만 얹습니다(파일이 먼저 세운 오디오 · 발화 모듈이 삽니다).
 */
export async function renderSignedInApp(
  ui: Parameters<typeof render>[0],
  options: {
    readonly refreshedAccessToken?: string;
    /**
     * 저장소 대역을 직접 넘길 때 씁니다(예: 호출을 기록하는 대역, 이미 값이 든 저장소). 넘기면 이 헬퍼는
     * 세션을 심지 않습니다 — 부를 쪽이 `authSessionStorageKey`를 넣어 둡니다.
     */
    readonly storageModule?: StorageModuleDouble;
  } = {},
): Promise<ReturnType<typeof render>> {
  const refreshedSessionBody = refreshedSessionBodyFor(
    options.refreshedAccessToken ?? "refreshed-access-token",
  );
  const previousNativeModules = (globalThis as { NativeModules?: unknown }).NativeModules;
  const store = new Map<string, string>();
  store.set(authSessionStorageKey, serializeAuthSession(signedInBootSession));
  vi.stubGlobal("NativeModules", {
    ...(typeof previousNativeModules === "object" && previousNativeModules !== null
      ? previousNativeModules
      : {}),
    StorageModule: options.storageModule ?? {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  // 갱신 요청만 성공합니다 — 부팅 뒤 뜻밖의 요청이 성공으로 보이지 않게 그 밖은 거부합니다.
  vi.stubGlobal("fetch", (url: string) => {
    if (typeof url === "string" && url.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedSessionBody });
    }
    return Promise.reject(new Error(`renderSignedInApp: 예상 밖 요청 ${String(url)}`));
  });

  vi.useFakeTimers();
  const result = render(ui);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();

  if (screen.queryByTestId("splash-screen-logo") !== null) {
    throw new Error("renderSignedInApp: 스플래시를 지나지 못했습니다");
  }
  return result;
}
