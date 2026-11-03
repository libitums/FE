import { expect, test } from "vitest";

import { decodeEpisode, type DecodeResult } from "./index";
import { minimalEpisode } from "./episode-wire.test-support";

// `unit` 계층: 에피소드 최상위 번역표(ADR-0091 D1) — 「영어 원문 → 번역」. 표가 틀려도 에피소드는 거부하지 않는다.

function decoded(translations: unknown): Extract<DecodeResult, { ok: true }> {
  const result = decodeEpisode(minimalEpisode({ translations }));
  if (!result.ok) throw new Error(`fail: ${JSON.stringify(result.errors)}`);
  return result;
}

const codes = (result: Extract<DecodeResult, { ok: true }>) =>
  result.warnings.map((warning) => warning.code);

test("TR1. 베트남어 표를 그대로 옮기고 경고가 없다", () => {
  const result = decoded({ vi: { "Fill in the blank.": "Điền vào chỗ trống.", water: "nước" } });
  expect(result.episode.translations).toEqual({
    vi: { "Fill in the blank.": "Điền vào chỗ trống.", water: "nước" },
  });
  expect(codes(result)).not.toContain("invalid-translation");
});

test("TR2. 표가 없으면 키가 없다", () => {
  const result = decodeEpisode(minimalEpisode());
  if (!result.ok) throw new Error("fail");
  expect("translations" in result.episode).toBe(false);
});

test("TR3. 문자열이 아닌 값 · 빈 번역은 그 항목만 빼고 경고 하나를 남긴다", () => {
  const result = decoded({ vi: { ok: "được", num: 3, blank: "  ", nul: null } });
  expect(result.episode.translations).toEqual({ vi: { ok: "được" } });
  expect(codes(result).filter((code) => code === "invalid-translation")).toHaveLength(1);
});

test("TR4. 모르는 언어 키는 조용히 버린다", () => {
  const result = decoded({ vi: { water: "nước" }, xx: { water: "?" } });
  expect(result.episode.translations).toEqual({ vi: { water: "nước" } });
  expect(codes(result)).not.toContain("invalid-translation");
});

test("TR5. 최상위가 객체가 아니거나 언어 값이 객체가 아니면 표 없이 경고 하나", () => {
  for (const bad of ["vi", [1], { vi: "nước" }]) {
    const result = decoded(bad);
    expect("translations" in result.episode).toBe(false);
    expect(codes(result).filter((code) => code === "invalid-translation")).toHaveLength(1);
  }
});

test("TR6. 남은 항목이 하나도 없으면 그 언어 키도 없다", () => {
  const result = decoded({ vi: { a: 1 } });
  expect("translations" in result.episode).toBe(false);
});

test("TR7. 인도네시아어 표도 같은 규칙으로 옮긴다(ADR-0093)", () => {
  const result = decoded({ vi: { water: "nước" }, id: { water: "air", bad: 1 } });
  expect(result.episode.translations).toEqual({ vi: { water: "nước" }, id: { water: "air" } });
  expect(codes(result).filter((code) => code === "invalid-translation")).toHaveLength(1);
});
