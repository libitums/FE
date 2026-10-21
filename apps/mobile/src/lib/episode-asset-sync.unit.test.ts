import { describe, expect, test, vi } from "vitest";

import type { ContentStore } from "./episode-cache";
import * as assetSync from "./episode-asset-sync";
import {
  contentAssetsKey,
  ensureEpisodeAssets,
  isAssetsComplete,
  markAssetsComplete,
  syncEpisodeAssets,
  type AssetDeps,
  type DownloadResult,
} from "./episode-asset-sync";
import { flush } from "./episode-update.test-support";

// `unit` 계층: 에피소드 하나의 자산을 최대 4개 동시에 받는 규칙과 완료 표시입니다. 전송 · 파일은 대역입니다.

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

// 상수는 모듈 이름공간에서 읽습니다 — 아직 export가 없을 때도 이 파일이 컴파일되고 값 단언이 실패합니다.
const CONTENT_DOWNLOAD_CONCURRENCY = (
  assetSync as { readonly CONTENT_DOWNLOAD_CONCURRENCY?: number }
).CONTENT_DOWNLOAD_CONCURRENCY;

// 받기를 붙잡는 대역 — 호출마다 보류하고 손으로 풉니다. 시작 순서 · 동시에 진행 중인 수를 기록합니다.
type Held = AssetDeps & {
  readonly started: string[];
  readonly peak: () => number;
  readonly inFlight: () => number;
  /** 그 경로의 받기를 풉니다. 아직 시작하지 않았으면 false. */
  readonly release: (path: string, outcome?: DownloadResult | Error) => boolean;
};

function held(present: readonly string[] = []): Held {
  const saved = new Set(present);
  const waiting = new Map<string, (outcome: DownloadResult | Error) => void>();
  const started: string[] = [];
  let inFlight = 0;
  let peak = 0;
  return {
    started,
    peak: () => peak,
    inFlight: () => inFlight,
    has: (path) => saved.has(path),
    remoteUrlOf: (path) => `https://cdn.example/content/${path}`,
    download: (_url, path) => {
      started.push(path);
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      return new Promise<DownloadResult>((resolve, reject) => {
        waiting.set(path, (outcome) => {
          inFlight -= 1;
          if (outcome instanceof Error) {
            reject(outcome);
            return;
          }
          if (outcome.status === "saved") saved.add(path);
          resolve(outcome);
        });
      });
    },
    release: (path, outcome = { status: "saved" }) => {
      const settle = waiting.get(path);
      if (settle === undefined) return false;
      waiting.delete(path);
      settle(outcome);
      return true;
    },
  };
}

const notFound: DownloadResult = { status: "http", code: 404 };

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

  test("AS2b. Supabase Storage가 없는 파일에 내는 400도 서버에 없는 것이다 — 막지 않는다(기기 관찰 2026-10-19)", async () => {
    const d = deps({ "audio/u03-mina/d-01.m4a": { status: "http", code: 400 } });

    const result = await syncEpisodeAssets(d, ["audio/u03-mina/d-01.m4a", "images/x.jpg"]);

    expect(result).toEqual({ state: "complete", missing: ["audio/u03-mina/d-01.m4a"] });
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

  test.each([
    ["network", { status: "network" }],
    ["io", { status: "io" }],
    ["http 500", { status: "http", code: 500 }],
    ["unavailable", { status: "unavailable" }],
    ["던짐", new Error("boom")],
  ] as [string, DownloadResult | Error][])(
    "AS3′. 경로 b가 %s로 실패하면 새로 시작하지 않고 진행 중인 것은 끝까지 기다린 뒤 incomplete다",
    async (_name, failure) => {
      const d = held();
      let settled = false;
      const done = syncEpisodeAssets(d, ["a", "b", "c", "d", "e", "f"]).then((result) => {
        settled = true;
        return result;
      });
      await flush();
      expect(d.started).toEqual(["a", "b", "c", "d"]);

      expect(d.release("b", failure)).toBe(true);
      await flush();
      expect(d.started).toEqual(["a", "b", "c", "d"]);
      expect(settled).toBe(false);

      for (const path of ["a", "c"]) {
        expect(d.release(path)).toBe(true);
        await flush();
        expect(settled).toBe(false);
      }
      expect(d.release("d")).toBe(true);

      expect(await done).toEqual({ state: "incomplete" });
      expect(d.started).toEqual(["a", "b", "c", "d"]);
    },
  );

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

describe("syncEpisodeAssets — 동시 받기", () => {
  test("ASC1. 동시에 진행 중인 받기는 늘 CONTENT_DOWNLOAD_CONCURRENCY(= 4) 이하이고 하나 풀 때마다 하나씩 시작한다", async () => {
    expect(CONTENT_DOWNLOAD_CONCURRENCY).toBe(4);
    const d = held();
    const paths = ["a", "b", "c", "d", "e", "f", "g"];
    const done = syncEpisodeAssets(d, paths);
    await flush();
    expect(d.started).toEqual(["a", "b", "c", "d"]);
    expect(d.inFlight()).toBe(4);

    expect(d.release("c")).toBe(true);
    await flush();
    expect(d.started).toEqual(["a", "b", "c", "d", "e"]);
    expect(d.inFlight()).toBe(4);

    expect(d.release("a")).toBe(true);
    await flush();
    expect(d.started).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(d.release("b")).toBe(true);
    await flush();
    expect(d.started).toEqual(paths);

    for (const path of ["d", "e", "f", "g"]) {
      expect(d.release(path)).toBe(true);
      await flush();
    }
    expect(await done).toEqual({ state: "complete", missing: [] });
    expect(d.peak()).toBe(CONTENT_DOWNLOAD_CONCURRENCY);
  });

  test("ASC1. 경로가 둘이면 동시에 둘만 시작한다", async () => {
    const d = held();
    const done = syncEpisodeAssets(d, ["a", "b"]);
    await flush();
    expect(d.started).toEqual(["a", "b"]);
    expect(d.release("a")).toBe(true);
    expect(d.release("b")).toBe(true);
    expect(await done).toEqual({ state: "complete", missing: [] });
    expect(d.peak()).toBe(2);
  });

  test("ASC2. missing은 끝난 순서가 아니라 입력 순서이고, 완료 표시 바이트가 풀어 주는 순서와 무관하다", async () => {
    const answers: Record<string, DownloadResult> = {
      a: notFound,
      b: { status: "saved" },
      c: { status: "http", code: 400 },
      d: { status: "http", code: 410 },
    };
    async function run(order: readonly string[]) {
      const d = held();
      const store = memoryStore();
      const done = ensureEpisodeAssets(store, d, { id: "u09", sha256: "abc" }, [
        "a",
        "b",
        "c",
        "d",
      ]);
      await flush();
      expect(d.started).toEqual(["a", "b", "c", "d"]);
      for (const path of order) {
        expect(d.release(path, answers[path])).toBe(true);
        await flush();
      }
      return { outcome: await done, marker: store.data.get(contentAssetsKey("u09")) };
    }

    const reversed = await run(["d", "c", "b", "a"]);
    const forward = await run(["a", "b", "c", "d"]);

    expect(reversed.outcome).toBe("completed");
    expect(JSON.parse(reversed.marker ?? "{}")).toEqual({
      sha256: "abc",
      missing: ["a", "c", "d"],
    });
    expect(forward.marker).toBe(reversed.marker);
  });

  test("ASC3. onPathSettled는 경로마다 정확히 한 번, 끝난 순서대로 — 이미 있음은 시작 전에 바로 부른다", async () => {
    const d = held(["present"]);
    const settled: string[] = [];
    const done = syncEpisodeAssets(
      d,
      ["a", "present", "b", "c"],
      (path) => void settled.push(path),
    );
    await flush();
    expect(settled).toEqual(["present"]);

    expect(d.release("c")).toBe(true);
    await flush();
    expect(d.release("a", notFound)).toBe(true);
    await flush();
    expect(d.release("b")).toBe(true);

    expect(await done).toEqual({ state: "complete", missing: ["a"] });
    expect(settled).toEqual(["present", "c", "a", "b"]);
  });

  test("ASC3. 실패 뒤에 끝난 진행 중 경로도 한 번씩 부르고 실패한 경로에는 부르지 않으며 끝난 뒤 더 부르지 않는다", async () => {
    const d = held();
    const settled: string[] = [];
    const done = syncEpisodeAssets(d, ["a", "b", "c", "d", "e"], (path) => void settled.push(path));
    await flush();
    expect(d.started).toEqual(["a", "b", "c", "d"]);

    expect(d.release("b", { status: "network" })).toBe(true);
    await flush();
    expect(settled).toEqual([]);
    expect(d.release("c")).toBe(true);
    await flush();
    expect(d.release("a")).toBe(true);
    await flush();
    expect(d.release("d")).toBe(true);

    expect(await done).toEqual({ state: "incomplete" });
    expect(settled).toEqual(["c", "a", "d"]);
    const count = settled.length;
    await flush();
    expect(settled).toHaveLength(count);
  });

  test("ASC4. 같은 경로는 한 번만 받고 콜백도 한 번만 부르며 missing에 같은 경로가 두 번 들지 않는다", async () => {
    const d = held();
    const settled: string[] = [];
    const done = syncEpisodeAssets(d, ["a", "b", "a", "c", "b"], (path) => void settled.push(path));
    await flush();
    expect(d.started).toEqual(["a", "b", "c"]);

    expect(d.release("a")).toBe(true);
    expect(d.release("b", notFound)).toBe(true);
    expect(d.release("c")).toBe(true);

    expect(await done).toEqual({ state: "complete", missing: ["b"] });
    expect(d.started).toEqual(["a", "b", "c"]);
    expect([...settled].sort()).toEqual(["a", "b", "c"]);
  });

  test("ASC5. 셋째 경로의 주소가 없으면 새로 시작하지 않고 앞의 둘은 끝까지 받은 뒤 incomplete다", async () => {
    const base = held();
    const probe: AssetDeps = {
      has: base.has,
      download: base.download,
      remoteUrlOf: (path) => (path === "c" ? null : `https://cdn.example/content/${path}`),
    };
    const settled: string[] = [];
    let finished = false;
    const done = syncEpisodeAssets(probe, ["a", "b", "c", "d", "e"], (path) => {
      settled.push(path);
    }).then((result) => {
      finished = true;
      return result;
    });
    await flush();
    expect(base.started).toEqual(["a", "b"]);
    expect(finished).toBe(false);

    expect(base.release("a")).toBe(true);
    await flush();
    expect(finished).toBe(false);
    expect(base.release("b")).toBe(true);

    expect(await done).toEqual({ state: "incomplete" });
    expect(base.started).toEqual(["a", "b"]);
    expect(settled).toEqual(["a", "b"]);
  });

  test("ASC5. 받는 중 거부(던짐)는 io로 거두고 같은 규칙을 따른다 — 바깥 promise는 거부되지 않는다", async () => {
    const d = held();
    const done = syncEpisodeAssets(d, ["a", "b", "c", "d", "e"]);
    await flush();
    expect(d.started).toEqual(["a", "b", "c", "d"]);

    d.release("a", new Error("boom"));
    await flush();
    expect(d.started).toEqual(["a", "b", "c", "d"]);
    for (const path of ["b", "c", "d"]) expect(d.release(path)).toBe(true);

    await expect(done).resolves.toEqual({ state: "incomplete" });
  });
});

describe("ensureEpisodeAssets — 옵션", () => {
  const entry = { id: "u09", sha256: "abc" };

  test("ASO1. 옵션 없이 부르면 활성 표시 contentAssetsKey(id)에 {sha256, missing}을 쓴다", async () => {
    const store = memoryStore();
    const d = deps({ "audio/a.m4a": notFound });

    expect(await ensureEpisodeAssets(store, d, entry, ["images/a.jpg", "audio/a.m4a"])).toBe(
      "completed",
    );

    expect(JSON.parse(store.data.get(contentAssetsKey("u09")) ?? "")).toEqual({
      sha256: "abc",
      missing: ["audio/a.m4a"],
    });
  });

  test("ASO2. markerKey를 주면 그 키에만 쓰고 활성 표시는 그대로이며 isAssetsComplete가 그 키를 읽는다", async () => {
    const store = memoryStore();

    expect(
      await ensureEpisodeAssets(store, deps({}), entry, ["images/a.jpg"], {
        markerKey: "staged.assets.u09",
      }),
    ).toBe("completed");

    expect(JSON.parse(store.data.get("staged.assets.u09") ?? "null")).toEqual({
      sha256: "abc",
      missing: [],
    });
    expect(store.data.has(contentAssetsKey("u09"))).toBe(false);
    expect(isAssetsComplete(store, "u09", "abc", "staged.assets.u09")).toBe(true);
    expect(isAssetsComplete(store, "u09", "abc")).toBe(false);
    expect(isAssetsComplete(store, "u09", "other", "staged.assets.u09")).toBe(false);
  });

  test("ASO2. markerKey에 이미 표시가 있으면 already이고 받지 않는다", async () => {
    const store = memoryStore();
    markAssetsComplete(store, "u09", "abc", [], "staged.assets.u09");
    const d = deps({});

    expect(
      await ensureEpisodeAssets(store, d, entry, ["images/a.jpg"], {
        markerKey: "staged.assets.u09",
      }),
    ).toBe("already");
    expect(d.download).not.toHaveBeenCalled();
    expect(store.data.has(contentAssetsKey("u09"))).toBe(false);
  });

  test("ASO3. onPathSettled는 이미 있음 · 받음 · 404 경로에 한 번씩 부르고 연결 실패 경로에는 부르지 않는다", async () => {
    const settled: string[] = [];
    const d = deps({ "images/c.jpg": notFound }, ["images/a.jpg"]);

    await ensureEpisodeAssets(
      memoryStore(),
      d,
      entry,
      ["images/a.jpg", "images/b.jpg", "images/c.jpg"],
      {
        onPathSettled: (path) => void settled.push(path),
      },
    );
    expect([...settled].sort()).toEqual(["images/a.jpg", "images/b.jpg", "images/c.jpg"]);

    settled.length = 0;
    const failing = deps({ "images/b.jpg": { status: "network" } });
    expect(
      await ensureEpisodeAssets(memoryStore(), failing, entry, ["images/a.jpg", "images/b.jpg"], {
        onPathSettled: (path) => void settled.push(path),
      }),
    ).toBe("incomplete");
    expect(settled).not.toContain("images/b.jpg");
  });
});
