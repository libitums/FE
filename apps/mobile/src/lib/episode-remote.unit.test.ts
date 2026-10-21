import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import * as remote from "./episode-remote";
import { contentBaseUrl, fetchContentText, resolveContentUrlSafe } from "./episode-remote";

// `unit` 계층: 순수 함수 `contentBaseUrl` · `resolveContentUrlSafe`의 입출력만 봅니다.

const BASE = "https://x.supabase.co/storage/v1/object/public/content/";

describe("episode-remote", () => {
  test.each([
    ["끝 슬래시 없음", "https://x.supabase.co"],
    ["끝 슬래시 있음", "https://x.supabase.co/"],
  ])("R1. contentBaseUrl은 버킷 경로를 붙여 정규화한다 (%s)", (_name, url) => {
    expect(contentBaseUrl(url)).toBe(BASE);
  });

  test.each(["episodes/u01.json", "images/u01-water/pre-1.jpg"])(
    "R2. 상대 경로 %s는 기준 뒤에 붙는다",
    (relative) => {
      expect(resolveContentUrlSafe(BASE, relative)).toBe(`${BASE}${relative}`);
    },
  );

  test.each([
    ["빈 값", ""],
    ["선두 슬래시", "/abs"],
    ["상위 조각", "../x"],
    ["중간 상위 조각", "a/../b"],
    ["스킴 포함", "https://evil/x"],
  ])("R3. 상대 경로가 아니면 null (%s)", (_name, relative) => {
    expect(resolveContentUrlSafe(BASE, relative)).toBeNull();
  });

  // 콘텐츠가 버킷 이름을 붙여 적은 경로(`content/images/…`)도 같은 파일을 가리킨다 — 기준이 이미 버킷이다.
  test.each([
    ["content/images/u01-water/pre-1.jpg", "images/u01-water/pre-1.jpg"],
    ["content/images/items/bag.jpg", "images/items/bag.jpg"],
    ["content/audio/u01-water/d-01.m4a", "audio/u01-water/d-01.m4a"],
  ])("R4. 선두 버킷 이름 조각 %s는 한 번 떼고 붙인다", (relative, stripped) => {
    expect(resolveContentUrlSafe(BASE, relative)).toBe(`${BASE}${stripped}`);
  });

  test("R5. 버킷 이름 조각만 있으면 null, 조각은 한 번만 뗀다", () => {
    expect(resolveContentUrlSafe(BASE, "content/")).toBeNull();
    expect(resolveContentUrlSafe(BASE, "content/content/x.jpg")).toBe(`${BASE}content/x.jpg`);
    expect(resolveContentUrlSafe(BASE, "contents/x.jpg")).toBe(`${BASE}contents/x.jpg`);
  });

  test("R6. 버킷 이름 조각을 뗀 뒤에도 상위 조각은 null", () => {
    expect(resolveContentUrlSafe(BASE, "content/../x")).toBeNull();
  });
});

describe("fetchContentText", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function arm() {
    vi.stubEnv("PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const spy = vi.fn(async () => ({ status: 200, text: async () => "body" }));
    vi.stubGlobal("fetch", spy);
    return spy;
  }

  test.each(["../x", "https://evil/x", "/abs"])(
    "R4. 거부 경로 %s는 전송을 부르지 않고 network",
    async (relative) => {
      const spy = arm();
      expect(await fetchContentText(relative)).toEqual({ ok: false, reason: "network" });
      expect(spy).not.toHaveBeenCalled();
    },
  );

  test("R5. manifest.json은 공개 버킷 주소로 GET · apikey 헤더 · 본문 없이 한 번 보낸다", async () => {
    const spy = arm();
    expect(await fetchContentText("manifest.json")).toEqual({
      ok: true,
      status: 200,
      text: "body",
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(url).toBe(`${BASE}manifest.json`);
    expect(init["method"]).toBe("GET");
    expect((init["headers"] as Record<string, string>)["apikey"]).toBe("anon-key");
    expect(init["body"]).toBeUndefined();
  });

  // ── 주소 키(ER-CK) — 새 export는 아직 없을 수 있어 모듈 전체로 접근한다 ──
  const keyApi = remote as unknown as {
    contentRequestQuery: (key: unknown, nowMs: number) => string;
    createContentFetchText: (
      now: () => number,
    ) => (relative: string, key?: unknown) => ReturnType<typeof fetchContentText>;
  };
  const SHA = "c4780d55e1a2b3c4" + "0123456789abcdef".repeat(3);
  const FRESH = { kind: "fresh" } as const;
  const VERSION = { kind: "version", sha256: SHA } as const;
  const NOW = 1_800_000_000_000;
  const sentUrls = (spy: ReturnType<typeof arm>) =>
    spy.mock.calls.map((call) => (call as unknown as [string])[0]);

  test("ER-CK1. contentRequestQuery: version은 sha 앞 16자, fresh는 분 단위, 나머지는 빈 문자열", () => {
    const q = keyApi.contentRequestQuery;
    expect(q(VERSION, NOW)).toBe("?v=c4780d55e1a2b3c4");
    expect(q(FRESH, NOW)).toBe("?m=30000000");
    expect(q(FRESH, 59_999)).toBe("?m=0");
    expect(q(FRESH, 60_000)).toBe("?m=1");
    expect(q(undefined, NOW)).toBe("");
    for (const sha256 of [SHA.toUpperCase(), SHA.slice(0, 63), `${SHA.slice(0, 63)}z`]) {
      expect(q({ kind: "version", sha256 }, NOW)).toBe("");
    }
    for (const bad of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      expect(q(FRESH, bad)).toBe("");
    }
  });

  test("ER-CK2. createContentFetchText는 키에 맞는 쿼리를 주소 뒤에 붙여 보낸다", async () => {
    const spy = arm();
    const fetchText = keyApi.createContentFetchText(() => NOW);
    await fetchText("manifest.json", FRESH);
    await fetchText("episodes/u04-x.json", VERSION);
    await fetchText("manifest.json");
    expect(sentUrls(spy)).toEqual([
      `${BASE}manifest.json?m=30000000`,
      `${BASE}episodes/u04-x.json?v=c4780d55e1a2b3c4`,
      `${BASE}manifest.json`,
    ]);
  });

  test("ER-CK3. 같은 분 안에서는 같은 주소, 분이 넘어가면 다른 주소", async () => {
    const spy = arm();
    let now = NOW;
    const fetchText = keyApi.createContentFetchText(() => now);
    await fetchText("manifest.json", FRESH);
    now += 1_000;
    await fetchText("manifest.json", FRESH);
    now = NOW + 60_000;
    await fetchText("manifest.json", FRESH);
    const urls = sentUrls(spy);
    expect(urls[1]).toBe(urls[0]);
    expect(urls[2]).not.toBe(urls[0]);
  });

  test.each(["../x", "/abs", "https://evil/x"])(
    "ER-CK4a. 거부 경로 %s는 키가 있어도 전송 0회 · network",
    async (relative) => {
      const spy = arm();
      const fetchText = keyApi.createContentFetchText(() => NOW);
      expect(await fetchText(relative, FRESH)).toEqual({ ok: false, reason: "network" });
      expect(spy).not.toHaveBeenCalled();
    },
  );

  test.each(["episodes/a.json?x=1", "episodes/a.json#frag"])(
    "ER-CK4b. 상대 경로에 ? 또는 #이 있으면(%s) 쿼리를 붙이지 않는다",
    async (relative) => {
      const spy = arm();
      const fetchText = keyApi.createContentFetchText(() => NOW);
      await fetchText(relative, VERSION);
      expect(sentUrls(spy)).toEqual([`${BASE}${relative}`]);
    },
  );

  test.each(["manifest.json", "episodes/u04-x.json", "audio/manifest.json"])(
    "ER-CK5a. %s 요청 헤더는 apikey뿐이다",
    async (relative) => {
      const spy = arm();
      await fetchContentText(relative);
      const [, init] = spy.mock.calls[0] as unknown as [string, Record<string, unknown>];
      expect(init["headers"]).toEqual({ apikey: "anon-key" });
    },
  );

  test("ER-CK5b. CONTENT_NO_CACHE_HEADERS는 더 이상 export하지 않는다", () => {
    expect("CONTENT_NO_CACHE_HEADERS" in remote).toBe(false);
  });

  test("ER-CK5c. 공용 전송 소스는 캐시 헤더를 짓지 않는다", () => {
    const source = readFileSync(resolve(__dirname, "supabase-transport.ts"), "utf8");
    expect(source).not.toMatch(/no-cache/i);
    expect(source).not.toMatch(/pragma/i);
  });
});
