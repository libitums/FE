import { expect, test } from "vitest";

import { cannedRefusal, refusalStage, trimRefusal } from "./chat-send-refusal.ts";

const at = (strikes: number, strikeLimit: number) =>
  refusalStage({ strikes, strikeLimit, memoryFull: false });

test("RF1. 단계 — 이번 차단을 더한 수가 상한까지는 회피, 넘으면 매번 경고(일시 차단 없음)", () => {
  expect([0, 1, 2, 3, 4, 9].map((strikes) => at(strikes, 3))).toEqual([
    "deflect",
    "deflect",
    "deflect",
    "warn",
    "warn",
    "warn",
  ]);
  expect([0, 4, 5].map((strikes) => at(strikes, 5))).toEqual(["deflect", "deflect", "warn"]);
  expect([0, 1].map((strikes) => at(strikes, 1))).toEqual(["deflect", "warn"]);
  // 반복 위반 수를 읽지 못하면 회피 — 차감은 저장이 센 수로 따로 정한다.
  expect(refusalStage(null)).toBe("deflect");
});

test("RF2. 모델 답은 대사 둘 · 행동 하나까지, 서술은 버린다", () => {
  expect(
    trimRefusal([
      { kind: "narration", text: "바람이 분다" },
      { kind: "action", text: "고개를 젓는다" },
      { kind: "speech", text: "하나" },
      { kind: "action", text: "웃는다" },
      { kind: "speech", text: "둘" },
      { kind: "speech", text: "셋" },
    ]),
  ).toEqual([
    { kind: "action", text: "고개를 젓는다" },
    { kind: "speech", text: "하나" },
    { kind: "speech", text: "둘" },
  ]);
});

test("RF3. 정해진 줄 — 그 말투 → 페르소나 존댓말 → 기본 줄", () => {
  const persona = {
    name: "미나",
    refusalLines: { deflect: { polite: "넘어가요!", slang: "패스!" } },
  };
  expect(cannedRefusal(persona, "deflect", "slang")).toEqual([{ kind: "speech", text: "패스!" }]);
  expect(cannedRefusal(persona, "deflect", "casual")).toEqual([
    { kind: "speech", text: "넘어가요!" },
  ]);
  expect(cannedRefusal(persona, "warn", "casual")[0]?.text).toBe(
    "그런 말은 좀 아니야. 그런 얘기는 하지 말자. 다른 얘기 하자.",
  );
  expect(cannedRefusal({ name: "누구" }, "deflect", "polite")[0]?.text).toContain("다른 얘기");
});
