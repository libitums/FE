import { describe, expect, test } from "vitest";

import { adultAckStepOf, isAdultByBirthYear } from "./adult-ack";
import type { AdultAckInput, AdultAckStep } from "./adult-ack";
import type { ChatBirthYear } from "./chat-source.contract";

// `unit` 계층(AA-U1 ~ U3): 성인 확인 창의 판정(ADR-0163 D4). 일반 인물 × 수위 × 생년 × 동의의 모든 칸을 돌고, 창은 「일반 · open · 생년상
// 성인 · 동의가 참이 아님」에서만 선다. 나이 모름(물어보지 않음 · 건너뜀)은 늘 창 없음.

const NOW = Date.UTC(2026, 10, 19);
const birthYears: Record<string, ChatBirthYear> = {
  unasked: { kind: "unasked" },
  skipped: { kind: "skipped" },
  minor: { kind: "set", year: 2010 },
  turns18: { kind: "set", year: 2008 },
  adult: { kind: "set", year: 1995 },
};
const adultBands = new Set(["turns18", "adult"]);

describe("성인 확인 판정", () => {
  test("AA-U1 생년상 성인 = 올해 − 생년 ≥ 18(서버 age_band와 같음), 모르면 거짓", () => {
    expect(isAdultByBirthYear({ kind: "set", year: 2008 }, NOW)).toBe(true);
    expect(isAdultByBirthYear({ kind: "set", year: 2009 }, NOW)).toBe(false);
    expect(isAdultByBirthYear({ kind: "unasked" }, NOW)).toBe(false);
    expect(isAdultByBirthYear({ kind: "skipped" }, NOW)).toBe(false);
  });

  // 진리표 — kind 2 × 수위 3 × 생년 5 × 동의 4 = 120칸.
  const rows: [AdultAckInput, AdultAckStep][] = [];
  for (const kind of ["story", "general"] as const)
    for (const romanceTier of ["open", "standard", null] as const)
      for (const [band, birthYear] of Object.entries(birthYears))
        for (const adultAck of [undefined, null, false, true] as const) {
          const gated = kind === "general" && romanceTier === "open" && adultBands.has(band);
          const expected: AdultAckStep = !gated
            ? "skip"
            : adultAck === undefined
              ? "read"
              : adultAck === true
                ? "skip"
                : "prompt";
          rows.push([{ kind, romanceTier, birthYear, now: NOW, adultAck }, expected]);
        }

  test("AA-U2 진리표 120칸 — 창은 일반 · open · 성인 · 동의 없음(못 읽음 포함)에서만", () => {
    expect(rows).toHaveLength(120);
    for (const [input, expected] of rows) {
      const label = `${input.kind}/${String(input.romanceTier)}/${JSON.stringify(input.birthYear)}/${String(input.adultAck)}`;
      expect(adultAckStepOf(input), label).toBe(expected);
    }
    expect(rows.filter(([, step]) => step === "prompt")).toHaveLength(4);
  });

  test("AA-U3 나이 모름 · 미성년자는 open 친구도 창 없음(생년을 넣으라는 길도 없음)", () => {
    for (const band of ["unasked", "skipped", "minor"])
      for (const adultAck of [undefined, null, false] as const)
        expect(
          adultAckStepOf({
            kind: "general",
            romanceTier: "open",
            birthYear: birthYears[band] ?? { kind: "unasked" },
            now: NOW,
            adultAck,
          }),
        ).toBe("skip");
  });
});
