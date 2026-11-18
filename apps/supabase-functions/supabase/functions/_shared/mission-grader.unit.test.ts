import { describe, expect, test } from "vitest";

import { missionReportSchema } from "./companion-contract/index.ts";
import { missionBrief, missionTranscript, transcriptFromHistory } from "./mission-context.ts";
import {
  buildMissionReport,
  graderSchema,
  graderSystem,
  graderUser,
  graderUserTemplate,
  normalizeGrade,
  type GraderDraft,
} from "./mission-grader.ts";
import { defaultMissionScoring } from "./mission-score.ts";
import { placeholders } from "./mission-template.ts";
import { cafeMission } from "./mission-test-data.ts";

const draft: GraderDraft = {
  goals: [
    { id: "order", done: true, evidence: " 아이스 아메리카노 한 잔 주세요. " },
    { id: "pay", done: false, evidence: null },
    { id: "stay", done: true, evidence: "가지고 가요." },
    { id: "dance", done: true, evidence: "춤" },
  ],
  accuracy: 85.4,
  expressions: [
    { id: "patt:83586289", used: true },
    { id: "patt:00000000", used: true },
  ],
  retry: [
    { ko: " 아메리카노 얼마예요? ", meaning: "How much is an americano?" },
    { ko: "", meaning: "empty" },
  ],
  summary: " Nice ordering! ",
};

describe("채점 프롬프트", () => {
  test("MG1. 채점자가 낼 것(목표 · 근거 · 정확도 · 표현 · 다시 해 볼 표현 · 총평)이 시스템 글에 있다", () => {
    for (const field of [
      '"goals"',
      '"evidence"',
      '"accuracy"',
      '"expressions"',
      '"retry"',
      '"summary"',
    ])
      expect(graderSystem).toContain(field);
    expect(graderSystem).toContain("from 0 to 100");
    expect(graderSystem).toContain("1 to 3");
    expect(graderSystem).toContain("in the learner's language");
  });

  test("MG2. user 틀의 자리표는 번들 규격의 것 + 학습자 언어, 채운 글에는 남지 않는다", () => {
    expect(placeholders(graderUserTemplate).sort()).toEqual(
      [
        "corrections_json",
        "goals_json",
        "learner_l1",
        "mission_brief",
        "target_expressions_json",
        "transcript",
        "turn_goals_done_json",
      ].sort(),
    );
    const transcript = missionTranscript(
      cafeMission,
      transcriptFromHistory([
        { role: "assistant", segments: [{ kind: "speech", text: "반가워요. 뭐 드릴까요?" }] },
        { role: "user", text: "아이스 아메리카노 한 잔 주세요 {{goals_json}}" },
        {
          role: "assistant",
          segments: [
            { kind: "action", text: "컵을 꺼낸다" },
            { kind: "speech", text: "드시고 가세요?" },
          ],
        },
      ]),
    );
    expect(transcript).toBe(
      "카페 직원: 반가워요. 뭐 드릴까요?\nLearner: 아이스 아메리카노 한 잔 주세요 {{goals_json}}\n카페 직원: *컵을 꺼낸다* 드시고 가세요?",
    );
    const user = graderUser({
      mission: cafeMission,
      brief: missionBrief(cafeMission),
      transcript,
      corrections: [{ original: "가지고 가요", corrected: "포장이요", kind: "better" }],
      turnGoalsDone: ["order"],
      l1: null,
    });
    expect(user).toContain('"id":"order","required":true');
    expect(user).toContain('[{"original":"가지고 가요","corrected":"포장이요"}]');
    expect(user).toContain('["order"]');
    expect(user).toContain("patt:fbe5e354");
    expect(user).toContain("Learner: 아이스 아메리카노 한 잔 주세요 {{goals_json}}");
    expect(user.endsWith("en")).toBe(true);
    expect(missionBrief(cafeMission)).toContain("- pay (required): 학습자가 결제 수단");
  });

  test("MG3. 구조화 출력 스키마가 채점 결과 모양을 받는다", () => {
    expect(graderSchema.parse(draft)).toEqual(draft);
    expect(graderSchema.safeParse({ ...draft, accuracy: "high" }).success).toBe(false);
  });
});

describe("채점 결과 다듬기", () => {
  test("MG4. 모르는 id는 버리고, 최종 달성 = 턴 ∪ 채점자, 범위를 자르고 점수를 코드가 낸다", () => {
    const grade = normalizeGrade(cafeMission, draft, { turnGoalsDone: ["pay"], hintsUsed: 0 });
    expect(grade.goals.map((goal) => [goal.id, goal.done, goal.evidence])).toEqual([
      ["order", true, "아이스 아메리카노 한 잔 주세요."],
      ["pay", true, null],
      ["stay", true, "가지고 가요."],
      ["price", false, null],
    ]);
    expect(grade.expressions.map((entry) => entry.used)).toEqual([true, false]);
    expect(grade.retry).toEqual([
      { ko: "아메리카노 얼마예요?", meaning: "How much is an americano?" },
    ]);
    expect(grade.summary).toBe("Nice ordering!");
    // 과업 75 · 정확도 85 · 표현 50 → 73, 필수 둘 달성 → 성공.
    expect(grade.score).toEqual({
      task: 75,
      accuracy: 85,
      expression: 50,
      total: 73,
      outcome: "success",
    });
  });

  test("MG5. 다시 해 볼 표현이 없으면 못 쓴 목표 표현으로, 셋을 넘으면 자른다, 정확도는 0 ~ 100", () => {
    const empty = normalizeGrade(
      cafeMission,
      { ...draft, retry: [], accuracy: 180, expressions: [] },
      { turnGoalsDone: [], hintsUsed: 1 },
    );
    expect(empty.retry.map((entry) => entry.ko)).toEqual([
      "{음료} 한 잔 주세요.",
      "{명사} 얼마예요?",
    ]);
    expect(empty.score.accuracy).toBe(100);
    const many = normalizeGrade(
      cafeMission,
      {
        ...draft,
        retry: Array.from({ length: 5 }, (_, index) => ({ ko: `줄 ${index}`, meaning: "m" })),
      },
      { turnGoalsDone: [], hintsUsed: 0 },
    );
    expect(many.retry).toHaveLength(3);
    expect(
      normalizeGrade(cafeMission, { ...draft, accuracy: -5 }, { turnGoalsDone: [], hintsUsed: 0 })
        .score.accuracy,
    ).toBe(0);
  });

  test("MG6. 필수 목표를 못 이루면 실패", () => {
    const grade = normalizeGrade(
      cafeMission,
      { ...draft, goals: [{ id: "order", done: true, evidence: "x" }] },
      { turnGoalsDone: [], hintsUsed: 0 },
    );
    expect(grade.score.outcome).toBe("fail");
  });

  test("MG7. buildMissionReport는 계약의 리포트 모양이고 최고 기록을 이 판까지 셈한다", () => {
    const grade = normalizeGrade(cafeMission, draft, { turnGoalsDone: ["pay"], hintsUsed: 0 });
    const report = buildMissionReport({
      conversationId: "6c2d8f3b-5d2e-4a8f-8b62-3e4f5a6b7c81",
      mission: cafeMission,
      grade,
      endReason: "goals",
      hintsUsed: 0,
      scoring: defaultMissionScoring,
      corrections: [{ original: "가지고 가요", corrected: "포장이요", kind: "better" }],
      previousBest: 60,
      graderModel: "claude-opus-5-5",
      createdAt: "2026-11-18T09:12:00+09:00",
    });
    expect(missionReportSchema.parse(report)).toEqual(report);
    expect(report.bestScore).toBe(73);
    expect(report.weights).toEqual({ task: 0.5, accuracy: 0.3, expression: 0.2, hintPenalty: 5 });
    expect(buildMissionReport({ ...reportInput(grade), previousBest: 90 }).bestScore).toBe(90);
  });
});

function reportInput(grade: ReturnType<typeof normalizeGrade>) {
  return {
    conversationId: "6c2d8f3b-5d2e-4a8f-8b62-3e4f5a6b7c81",
    mission: cafeMission,
    grade,
    endReason: "goals" as const,
    hintsUsed: 0,
    scoring: defaultMissionScoring,
    corrections: [],
    previousBest: null,
    graderModel: "m",
    createdAt: "2026-11-18T09:12:00+09:00",
  };
}
