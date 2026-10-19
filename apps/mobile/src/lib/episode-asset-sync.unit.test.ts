import { describe, expect, test, vi } from "vitest";

import type { ContentStore } from "./episode-cache";
import {
  contentAssetsKey,
  isAssetsComplete,
  markAssetsComplete,
  syncEpisodeAssets,
  type AssetDeps,
  type DownloadResult,
} from "./episode-asset-sync";

// `unit` 계층: 에피소드 하나의 자산을 차례로 받는 규칙과 완료 표시입니다. 전송 · 파일은 대역입니다.

function memoryStore(): ContentStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    available: () => true,
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  };
}

function deps(
  answers: Record<string, DownloadResult>,
  present: readonly string[] = [],
): AssetDeps & { download: ReturnType<typeof vi.fn> } {
  const saved = new Set(present);
  const download = vi.fn(async (_url: string, path: string): Promise<DownloadResult> => {
    const answer = answers[path] ?? { status: "saved" };
    if (answer.status === "saved") saved.add(path);
    return answer;
  });
  return {
    has: (path) => saved.has(path),
    download,
    remoteUrlOf: (path) => `https://cdn.example/content/${path}`,
  };
}

describe("syncEpisodeAssets", () => {
  test("AS1. 없는 자산만 원격 주소로 차례로 받고, 다 받으면 complete다", async () => {
    const d = deps({}, ["images/a.jpg"]);

    const result = await syncEpisodeAssets(d, ["images/a.jpg", "images/b.jpg", "audio/x.m4a"]);

    expect(result).toEqual({ state: "complete", missing: [] });
    expect(d.download.mock.calls).toEqual([
      ["https://cdn.example/content/images/b.jpg", "images/b.jpg"],
      ["https://cdn.example/content/audio/x.m4a", "audio/x.m4a"],
    ]);
  });

  test("AS2. 404 · 403 · 410은 서버에 없는 것으로 적고 다음으로 넘어간다 — 완료를 막지 않는다", async () => {
    const d = deps({
      "audio/a.m4a": { status: "http", code: 404 },
      "audio/b.m4a": { status: "http", code: 403 },
      "audio/c.m4a": { status: "http", code: 410 },
    });

    const result = await syncEpisodeAssets(d, [
      "audio/a.m4a",
      "audio/b.m4a",
      "audio/c.m4a",
      "images/d.jpg",
    ]);

    expect(result).toEqual({
      state: "complete",
      missing: ["audio/a.m4a", "audio/b.m4a", "audio/c.m4a"],
    });
    expect(d.download).toHaveBeenCalledTimes(4);
  });

  test("AS3. 연결 · 입출력 · 그 밖의 HTTP 실패면 그 자리에서 멈추고 incomplete다(다음 기회에 이어 받음)", async () => {
    for (const failure of [
      { status: "network" },
      { status: "io" },
      { status: "http", code: 500 },
      { status: "unavailable" },
    ] as DownloadResult[]) {
      const d = deps({ "images/b.jpg": failure });

      const result = await syncEpisodeAssets(d, ["images/a.jpg", "images/b.jpg", "images/c.jpg"]);

      expect(result).toEqual({ state: "incomplete" });
      expect(d.download).toHaveBeenCalledTimes(2);
    }
  });

  test("AS4. 원격 주소를 만들 수 없으면(설정 없음) 받지 않고 incomplete다", async () => {
    const d = { ...deps({}), remoteUrlOf: () => null };

    expect(await syncEpisodeAssets(d, ["images/a.jpg"])).toEqual({ state: "incomplete" });
    expect(d.download).not.toHaveBeenCalled();
  });

  test("AS5. 받는 중 던지면 incomplete로 거둔다", async () => {
    const d = deps({});
    d.download.mockRejectedValueOnce(new Error("boom"));

    expect(await syncEpisodeAssets(d, ["images/a.jpg"])).toEqual({ state: "incomplete" });
  });
});

describe("완료 표시", () => {
  test("AM1. 표시는 본문 sha가 같을 때만 완료다", () => {
    const store = memoryStore();

    expect(isAssetsComplete(store, "u09", "abc")).toBe(false);
    expect(markAssetsComplete(store, "u09", "abc", ["audio/a.m4a"])).toBe(true);
    expect(JSON.parse(store.data.get(contentAssetsKey("u09")) ?? "")).toEqual({
      sha256: "abc",
      missing: ["audio/a.m4a"],
    });
    expect(isAssetsComplete(store, "u09", "abc")).toBe(true);
    expect(isAssetsComplete(store, "u09", "def")).toBe(false);
  });

  test("AM2. 깨진 표시 · 읽기나 쓰기가 던지는 저장소는 완료가 아니다", () => {
    const store = memoryStore();
    store.data.set(contentAssetsKey("u09"), "{not json");
    expect(isAssetsComplete(store, "u09", "abc")).toBe(false);

    const throwing: ContentStore = {
      available: () => true,
      get: () => {
        throw new Error("x");
      },
      set: () => {
        throw new Error("x");
      },
      remove: () => undefined,
    };
    expect(isAssetsComplete(throwing, "u09", "abc")).toBe(false);
    expect(markAssetsComplete(throwing, "u09", "abc", [])).toBe(false);
  });
});
