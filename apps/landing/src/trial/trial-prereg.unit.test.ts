import { describe, expect, it } from "vitest";

import type { PreregEvent, PreregStatus, TrialPreregConfig } from "./trial-prereg.contract";
import {
  isValidEmail,
  normalizeEmail,
  preregOutcomeOf,
  preregRequestOf,
  reducePrereg,
  resolvePreregConfig,
} from "./trial-prereg";

// `unit` 계층: 사전 등록의 순수 함수 — 정규화 · 형식 · 요청 · 응답 해석 · 폼 상태 · env.

const config: TrialPreregConfig = {
  endpoint: "https://proj.example.test/rest/v1/pre_registrations",
  apiKey: "sb_publishable_test_key_0000000000",
};

describe("normalizeEmail · isValidEmail", () => {
  it("PR1 앞뒤 공백을 걷고 소문자로", () => {
    expect(normalizeEmail("  Mina.Kim@Example.COM \n")).toBe("mina.kim@example.com");
    expect(normalizeEmail("a@b.co")).toBe("a@b.co");
  });

  it("PR2 형식 — x@y.zz 꼴만, 공백 · @ 둘 · 최상위 한 글자 · 254자 넘음은 틀림", () => {
    for (const ok of ["a@b.co", "mina.kim+duru@example.com", "x_y@sub.domain.kr"]) {
      expect(isValidEmail(ok)).toBe(true);
    }
    for (const bad of [
      "",
      "mina",
      "mina@",
      "@example.com",
      "mina@example",
      "mina@example.c",
      "mi na@example.com",
      "mina@@example.com",
      "mina@exa mple.com",
    ]) {
      expect(isValidEmail(bad)).toBe(false);
    }
    const local = "a".repeat(64);
    const longest = `${local}@${"b".repeat(254 - 64 - 1 - 4)}.com`;
    expect(longest).toHaveLength(254);
    expect(isValidEmail(longest)).toBe(true);
    expect(isValidEmail(`a${longest}`)).toBe(false);
  });
});

describe("preregRequestOf", () => {
  it("PR3 POST · apikey · Content-Type · Prefer return=minimal · 몸 셋 · Authorization 없음 · credentials omit", () => {
    const request = preregRequestOf(config, "mina@example.com", "ko");
    expect(request.url).toBe(config.endpoint);
    expect(request.init.method).toBe("POST");
    expect(request.init.credentials).toBe("omit");
    expect(request.init.headers).toEqual({
      apikey: config.apiKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    });
    expect(Object.keys(request.init.headers).map((key) => key.toLowerCase())).not.toContain(
      "authorization",
    );
    expect(JSON.parse(request.init.body)).toEqual({
      email: "mina@example.com",
      locale: "ko",
      source: "web-trial",
    });
    expect(JSON.parse(preregRequestOf(config, "a@b.co", "en").init.body).locale).toBe("en");
  });
});

describe("preregOutcomeOf", () => {
  it("PR4 2xx → submitted, 409 → duplicate, 그 밖 · 네트워크 → failed", () => {
    expect(preregOutcomeOf(201)).toBe("submitted");
    expect(preregOutcomeOf(200)).toBe("submitted");
    expect(preregOutcomeOf(204)).toBe("submitted");
    expect(preregOutcomeOf(409)).toBe("duplicate");
    for (const status of [400, 401, 403, 404, 422, 429, 500, 503, 0, "network"] as const) {
      expect(preregOutcomeOf(status)).toBe("failed");
    }
  });
});

describe("reducePrereg", () => {
  const submit = (valid: boolean): PreregEvent => ({ type: "submit", valid });
  const result = (outcome: "submitted" | "duplicate" | "failed"): PreregEvent => ({
    type: "result",
    outcome,
  });

  it("PR5 제출 — 형식이 틀리면 invalid, 맞으면 sending(idle · invalid · failed에서)", () => {
    for (const from of ["idle", "invalid", "failed"] as const) {
      expect(reducePrereg(from, submit(false))).toBe("invalid");
      expect(reducePrereg(from, submit(true))).toBe("sending");
    }
  });

  it("PR5 응답 — sending에서만: submitted · duplicate → done, failed → failed", () => {
    expect(reducePrereg("sending", result("submitted"))).toBe("done");
    expect(reducePrereg("sending", result("duplicate"))).toBe("done");
    expect(reducePrereg("sending", result("failed"))).toBe("failed");
    for (const from of ["idle", "invalid", "failed", "done", "unavailable"] as const) {
      expect(reducePrereg(from, result("submitted"))).toBe(from);
    }
  });

  it("PR5 보내는 중 제출 · done · unavailable은 그대로", () => {
    const keep: PreregStatus[] = ["sending", "done", "unavailable"];
    for (const from of keep) {
      expect(reducePrereg(from, submit(true))).toBe(from);
      expect(reducePrereg(from, submit(false))).toBe(from);
    }
  });
});

describe("resolvePreregConfig", () => {
  const url = "https://proj.example.test";
  const key = "sb_publishable_abcdefghijklmnop_1234";

  it("PR6 둘 다 있으면 endpoint(끝 / 없음) · apiKey", () => {
    expect(resolvePreregConfig(url, key, false)).toEqual({
      endpoint: "https://proj.example.test/rest/v1/pre_registrations",
      apiKey: key,
    });
    expect(resolvePreregConfig(`${url}/`, ` ${key} `, true)).toEqual({
      endpoint: "https://proj.example.test/rest/v1/pre_registrations",
      apiKey: key,
    });
  });

  it("PR6 key 없음 + 비프로덕션 · url 없음 → null", () => {
    expect(resolvePreregConfig(url, undefined, false)).toBeNull();
    expect(resolvePreregConfig(url, "  ", false)).toBeNull();
    expect(resolvePreregConfig(undefined, key, false)).toBeNull();
    expect(resolvePreregConfig("", key, false)).toBeNull();
  });

  it("PR6 key 없음 + 프로덕션 → 던짐(이름을 말함)", () => {
    expect(() => resolvePreregConfig(url, undefined, true)).toThrow(/PUBLIC_SUPABASE_ANON_KEY/);
    expect(() => resolvePreregConfig(url, "", true)).toThrow(/PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("PR6 key 모양이 틀리면 던지고, 메시지에 key 값을 싣지 않는다", () => {
    for (const bad of [
      "short",
      "has space inside the key value",
      "sb_publishable_한글키값입니다abcdefgh",
    ]) {
      let message = "";
      try {
        resolvePreregConfig(url, bad, false);
      } catch (error) {
        message = String(error);
      }
      expect(message).toMatch(/PUBLIC_SUPABASE_ANON_KEY/);
      expect(message).not.toContain(bad);
    }
  });
});
