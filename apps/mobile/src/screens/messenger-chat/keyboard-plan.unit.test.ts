import { describe, expect, test } from "vitest";

import { keyboardPlanFor } from "./keyboard-plan";
import type { KoreanKeyboardPresence } from "./keyboard-ports";

// `unit` 계층(MC-U1): 키보드 규칙 표(spec §5.2) — 문맥 × 한국어 키보드 탐지 → 처음 키보드 · 토글.

const presences: readonly KoreanKeyboardPresence[] = ["present", "absent", "unknown"];

describe("keyboardPlanFor", () => {
  test.each(presences.map((presence) => [presence] as const))(
    "MC-U1. lesson + %s 는 학습 키보드이고 토글이 없다",
    (presence) => {
      expect(keyboardPlanFor("lesson", presence)).toEqual({
        initial: "learning",
        toggle: "hidden",
      });
    },
  );

  test("MC-U1. chat + present 는 휴대폰 키보드이고 토글이 없다", () => {
    expect(keyboardPlanFor("chat", "present")).toEqual({ initial: "phone", toggle: "hidden" });
  });

  test.each([["absent"], ["unknown"]] as const)(
    "MC-U1. chat + %s 는 학습 키보드이고 토글이 보인다",
    (presence) => {
      expect(keyboardPlanFor("chat", presence)).toEqual({ initial: "learning", toggle: "shown" });
    },
  );
});
