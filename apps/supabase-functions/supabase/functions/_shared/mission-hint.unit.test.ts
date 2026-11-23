import { expect, test } from "vitest";

import { feedbackContent, feedbackSystem } from "./companion-llm-prompts.ts";
import { missionBrief, missionFeedbackRequest } from "./mission-context.ts";
import {
  chosenHintGoal,
  hintAvailability,
  hintSchema,
  hintsLeft,
  hintSystem,
  hintUser,
  hintUserTemplate,
  normalizeHint,
  pickHintGoal,
} from "./mission-hint.ts";
import { placeholders } from "./mission-template.ts";
import { cafeMission, waterMission } from "./mission-test-data.ts";

test("MH1. 못 이룬 필수 목표가 먼저, 그다음 선택 목표 — 파일 순서", () => {
  expect(pickHintGoal(cafeMission, [])?.id).toBe("order");
  expect(pickHintGoal(cafeMission, ["order"])?.id).toBe("pay");
  expect(pickHintGoal(cafeMission, ["order", "pay"])?.id).toBe("stay");
  expect(pickHintGoal(cafeMission, ["order", "pay", "stay"])?.id).toBe("price");
  expect(pickHintGoal(cafeMission, ["order", "pay", "stay", "price"])).toBeNull();
  expect(pickHintGoal(waterMission, ["receipt"])?.id).toBe("bag");
});

test("MH2. 횟수 상한(3) · 못 이룬 목표 없음은 거절, 남은 힌트 수", () => {
  const progress = { goalsDone: [], learnerTurns: 2, hintsUsed: 2 };
  expect(hintAvailability(cafeMission, progress)).toEqual({ ok: true, goal: cafeMission.goals[0] });
  expect(hintAvailability(cafeMission, { ...progress, hintsUsed: 3 })).toEqual({
    ok: false,
    reason: "limit_reached",
  });
  expect(
    hintAvailability(cafeMission, { ...progress, goalsDone: ["order", "pay", "stay", "price"] }),
  ).toEqual({ ok: false, reason: "nothing_left" });
  expect(hintAvailability(cafeMission, { ...progress, hintsUsed: 4 }, 5).ok).toBe(true);
  expect(hintsLeft(progress)).toBe(1);
  expect(hintsLeft({ ...progress, hintsUsed: 9 })).toBe(0);
});

test("MH3. 힌트 프롬프트 — 규칙과 자리표, 채운 글에 목표 · 장면이 들어간다", () => {
  expect(hintSystem).toContain('"ko"');
  expect(hintSystem).toContain('"roman"');
  expect(hintSystem).toContain('"meaning"');
  expect(hintSystem).toContain("reaches the chosen goal and nothing more");
  expect(placeholders(hintUserTemplate).sort()).toEqual(
    [
      "goal_criteria",
      "goal_id",
      "open_goals_json",
      "learner_l1",
      "mission_brief",
      "target_expressions_json",
      "transcript",
    ].sort(),
  );
  const goal = pickHintGoal(cafeMission, ["order"]);
  if (goal === null) throw new Error("목표 없음");
  const user = hintUser({
    mission: cafeMission,
    goal,
    brief: missionBrief(cafeMission),
    transcript: "카페 직원: 반가워요. 뭐 드릴까요?",
    l1: "my",
  });
  expect(user).toContain("pay: 학습자가 결제 수단(카드 · 현금 등)을 말했다.");
  expect(user).toContain(cafeMission.scene);
  expect(user.endsWith("my")).toBe(true);
});

test("MH4. 스키마와 다듬기 — 공백 · 따옴표를 걷고, 빈 한국어면 null", () => {
  expect(
    hintSchema.parse({
      goalId: "pay",
      ko: "카드로 할게요.",
      roman: "kadeuro halgeyo.",
      meaning: "By card.",
    }),
  ).toBeTruthy();
  expect(hintSchema.safeParse({ ko: "카드로 할게요." }).success).toBe(false);
  expect(
    normalizeHint({
      goalId: " pay ",
      ko: ' "카드로 할게요." ',
      roman: " kadeuro halgeyo. ",
      meaning: " By card. ",
    }),
  ).toEqual({
    goalId: "pay",
    ko: "카드로 할게요.",
    roman: "kadeuro halgeyo.",
    meaning: "By card.",
  });
  expect(normalizeHint({ goalId: "pay", ko: "  ", roman: "", meaning: "" })).toBeNull();
});

test("MH5. 미션 턴의 교정 요청 — 컴패니언 교정 프롬프트를 그대로, 상대는 미션의 호칭 · 역할, 존댓말 관계", () => {
  const request = missionFeedbackRequest(cafeMission, {
    text: "아메리카노 한 잔 줘",
    l1: "th",
    history: [
      { role: "assistant", segments: [{ kind: "speech", text: "반가워요. 뭐 드릴까요?" }] },
    ],
    signal: new AbortController().signal,
  });
  expect(request.speechLevel).toBe("polite");
  expect(request.character).toEqual({
    name: "카페 직원",
    role: cafeMission.counterpart.role,
    banmalFeedback: "correction",
  });
  expect(request.history).toEqual([{ role: "assistant", text: "반가워요. 뭐 드릴까요?" }]);
  expect(feedbackContent(request)).toContain("Character: 반가워요. 뭐 드릴까요?");
  expect(feedbackSystem(request)).toContain('BCP 47 tag "th"');
});

test("MH6. 모델이 고른 목표 — 열린 목표면 그것(상대역의 마지막 질문, 선택이라도), 아니면 기본 목표", () => {
  const pay = cafeMission.goals.find((goal) => goal.id === "pay");
  if (pay === undefined) throw new Error("pay 없음");
  expect(chosenHintGoal(cafeMission, ["order"], pay, "stay").id).toBe("stay");
  expect(chosenHintGoal(cafeMission, ["order", "stay"], pay, "stay").id).toBe("pay");
  expect(chosenHintGoal(cafeMission, ["order"], pay, "nope").id).toBe("pay");
  const user = hintUser({
    mission: cafeMission,
    goal: pay,
    brief: "b",
    transcript: "카페 직원: 드시고 가세요?",
    l1: "en",
    goalsDone: ["order"],
  });
  expect(user).toContain('"id":"stay"');
  expect(user).not.toContain('"id":"order"');
  expect(hintSystem).toContain("answer that question");
});
