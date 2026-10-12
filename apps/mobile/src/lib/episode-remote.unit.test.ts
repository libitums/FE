import { afterEach, describe, expect, test, vi } from "vitest";

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
});
