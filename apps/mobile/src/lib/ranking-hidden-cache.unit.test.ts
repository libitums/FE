import { afterEach, expect, test, vi } from "vitest";

import { authSessionStorageKey, serializeAuthSession } from "./auth-session";
import { loadRankingHidden, saveRankingHidden } from "./ranking-hidden-cache";

// `unit` 계층(ADR-0170 RK-U11): 숨기기 기기 사본은 계정별 칸 — 같은 기기의 다른 계정에 새지 않는다(리뷰 W2).

afterEach(() => {
  vi.unstubAllGlobals();
});

const b64 = (value: unknown) =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const tokenFor = (sub: string) => `${b64({ alg: "none" })}.${b64({ sub })}.sig`;

function signInAs(store: Map<string, string>, sub: string | null) {
  if (sub === null) store.delete(authSessionStorageKey);
  else
    store.set(
      authSessionStorageKey,
      serializeAuthSession({
        accessToken: tokenFor(sub),
        refreshToken: "r",
        expiresAt: 4_102_444_800_000,
      }),
    );
}

test("RK-U11. 계정 A의 숨김은 계정 B에 보이지 않고, 로그인이 없으면 읽지도 쓰지도 않는다", () => {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  signInAs(store, "user-a");
  saveRankingHidden(true);
  expect(loadRankingHidden()).toBe(true);
  signInAs(store, "user-b");
  expect(loadRankingHidden()).toBe(false);
  signInAs(store, null);
  saveRankingHidden(true);
  expect(loadRankingHidden()).toBe(false);
  signInAs(store, "user-a");
  expect(loadRankingHidden()).toBe(true);
});
