import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "./site-url";

const resolve = (env: string | undefined, fallback: string) => resolveSiteUrl({ env, fallback });

describe("resolveSiteUrl", () => {
  it("U-SU1 env와 fallback이 모두 비면 빈 문자열", () => {
    expect(resolve(undefined, "")).toBe("");
  });

  it("U-SU2 빈 env · 공백뿐인 env는 없음으로 본다", () => {
    expect(resolve("", "")).toBe("");
    expect(resolve("   ", "")).toBe("");
  });

  it("U-SU3 https 오리진은 그대로 나온다", () => {
    expect(resolve("https://example.test", "")).toBe("https://example.test");
  });

  it("U-SU4 끝 슬래시를 지운다", () => {
    expect(resolve("https://example.test/", "")).toBe("https://example.test");
  });

  it("U-SU5 앞뒤 공백을 지운다", () => {
    expect(resolve(" https://example.test ", "")).toBe("https://example.test");
  });

  it("U-SU6 호스트는 소문자, 포트는 유지", () => {
    expect(resolve("https://Example.TEST:8443", "")).toBe("https://example.test:8443");
  });

  it("U-SU7 env가 없으면 fallback으로 떨어진다", () => {
    expect(resolve(undefined, "https://duru.example")).toBe("https://duru.example");
  });

  it("U-SU8 env가 fallback을 이긴다", () => {
    expect(resolve("https://a.test", "https://b.test")).toBe("https://a.test");
  });

  it("U-SU9 https로 시작하지 않는 값은 출처 · 원문 · 기대 꼴을 담아 던진다", () => {
    expect(() => resolve("example.test", "")).toThrow(/SITE_URL/);
    expect(() => resolve("example.test", "")).toThrow(/example\.test/);
    expect(() => resolve("example.test", "")).toThrow(/https:\/\//);
  });

  it("U-SU10 http는 던진다", () => {
    expect(() => resolve("http://example.test", "")).toThrow(/SITE_URL/);
    expect(() => resolve("http://example.test", "")).toThrow(/http:\/\/example\.test/);
  });

  it("U-SU11 경로가 있으면 던진다", () => {
    expect(resolve("https://example.test", "")).toBe("https://example.test");
    expect(() => resolve("https://example.test/app", "")).toThrow(/\S/);
    expect(() => resolve("https://example.test//", "")).toThrow(/\S/);
  });

  it("U-SU12 쿼리 · 해시 · 사용자 정보가 있으면 던진다", () => {
    expect(resolve("https://example.test", "")).toBe("https://example.test");
    expect(() => resolve("https://example.test?x=1", "")).toThrow(/\S/);
    expect(() => resolve("https://example.test#top", "")).toThrow(/\S/);
    expect(() => resolve("https://user:pw@example.test", "")).toThrow(/\S/);
  });

  it("U-SU13 fallback이 틀리면 메시지에 fallbackSiteUrl이 들어간다", () => {
    expect(() => resolve(undefined, "http://b.test")).toThrow(/fallbackSiteUrl/);
  });

  it("U-SU14 고르지 않은 쪽은 검사하지 않는다", () => {
    expect(resolve("https://a.test", "틀린 값")).toBe("https://a.test");
  });
});
