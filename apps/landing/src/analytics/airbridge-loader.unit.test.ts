import { describe, expect, it } from "vitest";
import { airbridgeLoaderSnippet } from "./airbridge-loader";

describe("airbridgeLoaderSnippet", () => {
  it("U-AL1 공식 로더 스니펫의 고정 사실을 담고 init 호출은 없다", () => {
    expect(airbridgeLoaderSnippet.length).toBeGreaterThan(500);
    expect(airbridgeLoaderSnippet).toContain("static.airbridge.io");
    expect(airbridgeLoaderSnippet).toContain("airbridge");
    expect(airbridgeLoaderSnippet).toContain("isSDKEnabled");
    for (const method of ["init", "startTracking", "openDeeplink"]) {
      // 원문은 메서드 이름들을 공백으로 이은 한 문자열로 담는다 — 단어 경계로 잰다.
      expect(airbridgeLoaderSnippet).toMatch(new RegExp(`\\b${method}\\b`));
    }
    expect(airbridgeLoaderSnippet).not.toMatch(/airbridge\.init\(/);
    expect(airbridgeLoaderSnippet).not.toContain("<script");
  });
});
