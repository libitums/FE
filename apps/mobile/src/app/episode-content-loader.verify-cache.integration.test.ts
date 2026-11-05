import { afterEach, beforeEach, expect, test, vi } from "vitest";

// `integration` 계층 — 버그 재현: 받기 중 편이 하나씩 갖춰질 때마다 로더가 카탈로그를 다시 읽는다(`onEpisodeReady` →
// `loadEpisodeContent`). 그때 이미 받아 둔 편까지 sha256을 다시 계산해 백그라운드 스레드를 막았다. 저장소 경계만
// 대역이고 로더 · 카탈로그 · 검증은 실물입니다.

const sha = vi.hoisted(() => ({ calls: 0 }));
vi.mock("../lib/sha256", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/sha256")>();
  return {
    ...actual,
    sha256Hex: (bytes: Uint8Array) => {
      sha.calls += 1;
      return actual.sha256Hex(bytes);
    },
  };
});

const { CONTENT_MANIFEST_KEY, contentEpisodeKey } = await import("../lib/episode-cache");
const { manifestText, remote } = await import("../lib/episode-refresh.test-support");
const { loadEpisodeContent } = await import("./episode-content-loader");

const store = new Map<string, string>();
const all = Array.from({ length: 6 }, (_, index) => remote(`u3${String(index)}-x`, 30 + index));

/** 받기가 `count`편째를 갖춘 순간의 저장소 — 매니페스트는 전부, 본문은 받은 만큼. */
function storedUpTo(count: number): void {
  store.set(CONTENT_MANIFEST_KEY, manifestText(all));
  for (const item of all.slice(0, count))
    store.set(contentEpisodeKey(item.entry.id as string), item.text);
}

beforeEach(() => {
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  store.clear();
  // 픽스처(`remote`)가 만들며 센 계산은 빼고 셉니다.
  sha.calls = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("VCI1. 편이 하나씩 갖춰질 때마다 다시 읽어도 sha256은 새로 갖춘 편만 계산한다(합계 = 편 수)", () => {
  for (let count = 1; count <= all.length; count += 1) {
    storedUpTo(count);
    loadEpisodeContent();
  }

  expect(sha.calls).toBe(all.length);
});

test("VCI2. 다 받은 뒤 같은 저장소로 다시 읽으면 sha256을 계산하지 않는다", () => {
  storedUpTo(all.length);
  loadEpisodeContent();
  const afterFirst = sha.calls;

  store.set("libitum.unrelated", "x");
  loadEpisodeContent();

  expect(sha.calls).toBe(afterFirst);
});
