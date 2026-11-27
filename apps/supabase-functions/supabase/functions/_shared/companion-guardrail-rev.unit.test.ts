import { expect, test } from "vitest";

import { guardrailRev, guardrailRevOf, guardrailTexts } from "./companion-guardrail-rev.ts";
import { hardLimitVariants } from "./companion-prompt.ts";
import { commonRequests } from "./companion-prompt-requests.ts";
import { moderationInstruction } from "./companion-safety.ts";

// GV1 — 리비전이 덮는 범위. 여기서 빠진 지시문은 고쳐도 리비전이 그대로라, 운영 도구가 전후를 나누지 못합니다.
test("GV1. 글 목록 — 검사 지시문 30개(단계 2 × 연령대 3 × 선 5) + 수위선 셋 + 자주 오는 요청", () => {
  const texts = guardrailTexts();
  expect(texts).toHaveLength(34);
  expect(new Set(texts.slice(0, 30)).size).toBeGreaterThan(1);
  expect(texts[0]).toBe(moderationInstruction("input", "adult", "none"));
  expect(texts[4]).toBe(moderationInstruction("input", "adult", "open"));
  expect(texts[5]).toBe(moderationInstruction("input", "minor", "none"));
  expect(texts[29]).toBe(moderationInstruction("output_sync", "unknown", "open"));
  expect(texts.slice(30, 33)).toEqual(hardLimitVariants());
  expect(new Set(hardLimitVariants()).size).toBe(3);
  expect(texts[33]).toBe(commonRequests);
});

// GV2 — 같은 지시문이면 같은 값이어야 `chat-send`와 `companion-eval`의 리비전을 견줄 수 있습니다.
test("GV2. 같은 글이면 같은 값 · DB 검사와 같은 꼴(16진수 8자리)", async () => {
  const first = await guardrailRevOf(guardrailTexts());
  expect(first).toMatch(/^[0-9a-f]{8}$/);
  expect(await guardrailRevOf(guardrailTexts())).toBe(first);
  expect(await guardrailRev()).toBe(first);
  expect(guardrailRev()).toBe(guardrailRev());
  // 기대값을 리터럴로 둡니다 — 계산 방식(이어 붙이는 글 · 자르는 자리)이 바뀌면 여기서 드러납니다.
  expect(await guardrailRevOf(["a", "b"])).toBe("38022fd2");
});

test("GV3. 지시문 하나가 바뀌면 값이 바뀐다 — 글자 하나 · 차례 · 빠진 글", async () => {
  const texts = guardrailTexts();
  const base = await guardrailRevOf(texts);
  for (const index of [0, 17, 29, 30, 32, 33]) {
    const changed = texts.map((text, at) => (at === index ? `${text} ` : text));
    expect(await guardrailRevOf(changed), `글 ${index}`).not.toBe(base);
  }
  expect(await guardrailRevOf([texts[1]!, texts[0]!, ...texts.slice(2)])).not.toBe(base);
  expect(await guardrailRevOf(texts.slice(0, 33))).not.toBe(base);
});
