import { expect, test } from "vitest";

import { cannedRefusal, refusalStage, trimRefusal } from "./chat-send-refusal.ts";

const at = (strikes: number, strikeLimit: number) =>
  refusalStage({ strikes, strikeLimit, memoryFull: false });

test("RF1. 단계 — 이번 차단을 더한 수가 상한이면 일시 차단, 하나 앞이면 경고, 그 앞은 회피", () => {
  expect([0, 1, 2].map((strikes) => at(strikes, 3))).toEqual(["deflect", "warn", "block"]);
  expect([0, 1, 2, 3, 4].map((strikes) => at(strikes, 5))).toEqual([
    "deflect",
    "deflect",
    "deflect",
    "warn",
    "block",
  ]);
  expect([0, 1].map((strikes) => at(strikes, 2))).toEqual(["warn", "block"]);
  expect(at(0, 1)).toBe("block");
  // 상한을 낮춰 이미 넘은 수도 일시 차단.
  expect(at(7, 3)).toBe("block");
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
