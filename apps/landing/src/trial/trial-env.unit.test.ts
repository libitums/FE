import { describe, expect, it } from "vitest";

import { resolveTrialContentBase } from "./trial-env";

// `unit` 계층: 빌드 env `PUBLIC_SUPABASE_URL` → 음성 버킷 기준 주소.

describe("resolveTrialContentBase", () => {
  it("TN1 https 프로젝트 주소 → 버킷 기준 주소(끝 /)", () => {
    const expected = "https://x.supabase.co/storage/v1/object/public/content/";
    expect(resolveTrialContentBase("https://x.supabase.co", false)).toBe(expected);
    expect(resolveTrialContentBase("https://x.supabase.co", true)).toBe(expected);
  });

  it("TN1 비프로덕션에서 없거나 빈 값이면 빈 문자열(소리 없는 체험판)", () => {
    expect(resolveTrialContentBase(undefined, false)).toBe("");
    expect(resolveTrialContentBase("", false)).toBe("");
    expect(resolveTrialContentBase(" ", false)).toBe("");
  });

  it("TN1 프로덕션에서 없거나 빈 값이면 던진다", () => {
    const missing = "PUBLIC_SUPABASE_URL이 없습니다";
    expect(() => resolveTrialContentBase(undefined, true)).toThrow(missing);
    expect(() => resolveTrialContentBase("", true)).toThrow(missing);
    expect(() => resolveTrialContentBase(" ", true)).toThrow(missing);
  });

  it.each([["http://x.supabase.co"], ["https://x/a"], ["https://x?q"], ["x.supabase.co"]])(
    "TN1 모양이 틀린 값(%s)은 프로덕션 여부와 무관하게 던진다",
    (value) => {
      const malformed = `PUBLIC_SUPABASE_URL 모양이 틀렸습니다(https://<호스트>만): ${value}`;
      expect(() => resolveTrialContentBase(value, false)).toThrow(malformed);
      expect(() => resolveTrialContentBase(value, true)).toThrow(malformed);
    },
  );
});
