// 가짜 출처의 규칙 — 6화 「커피 주문」의 낱말 판정 · 상대역 대사 · 리포트 계산입니다. 서버(상태 줄 · 채점 모델)의 흉내일 뿐
// 앱의 판정이 아닙니다 — 서버 구현이 붙으면 이 파일은 개발 미리보기 · 테스트에서만 돕니다.

import { missionReportFixture, missionStartFixture } from "./mission-fixture";
import type { MissionEndReason, MissionReport } from "./roleplay-mission.contract";

/** 목표마다 이룬 것으로 볼 낱말(하나라도 들면 이룸). */
const GOAL_WORDS: Readonly<Record<string, readonly string[]>> = {
  order: ["주세요", "한 잔", "아메리카노", "라떼", "커피"],
  pay: ["카드", "현금", "계좌"],
  stay: ["가지고 가", "포장", "먹고 갈", "마시고 갈", "여기서"],
  price: ["얼마"],
};

/** 목표 표현마다 쓴 것으로 볼 낱말. */
const EXPRESSION_WORDS: Readonly<Record<string, string>> = {
  "patt:83586289": "한 잔",
  "patt:fbe5e354": "얼마",
};

export function goalsReachedBy(text: string): readonly string[] {
  return missionStartFixture.goals
    .map((goal) => goal.id)
    .filter((id) => (GOAL_WORDS[id] ?? []).some((word) => text.includes(word)));
}

type FakeLine = { readonly ko: string; readonly en: string };

const REPLIES: Readonly<Record<string, FakeLine>> = {
  order: {
    ko: "네, 아이스 아메리카노 한 잔이요. 드시고 가세요?",
    en: "Sure, one iced americano. For here?",
  },
  stay: { ko: "알겠습니다. 결제는 어떻게 하시겠어요?", en: "Got it. How would you like to pay?" },
  pay: { ko: "네, 카드 받았습니다.", en: "Okay, I've got your card." },
  price: { ko: "오천 원이에요.", en: "It's five thousand won." },
};
const NUDGE: FakeLine = { ko: "음료는 뭘로 드릴까요?", en: "What would you like to drink?" };
const CLOSING: FakeLine = {
  ko: "감사합니다. 나오면 불러 드릴게요!",
  en: "Thank you. I'll call you when it's ready!",
};
const TIME_UP: FakeLine = {
  ko: "죄송해요, 뒤에 손님이 기다리셔서요. 다음에 또 오세요!",
  en: "Sorry, there are customers waiting. Please come again!",
};

/** 상대역의 답 — 끝이면 마무리 대사, 아니면 방금 이룬 목표에 맞춘 말, 아무것도 못 이뤘으면 되돌리는 말. */
export function fakeReplyOf(reached: readonly string[], ended: MissionEndReason | null): FakeLine {
  if (ended === "goals") return CLOSING;
  if (ended === "turn_limit") return TIME_UP;
  const last = reached[reached.length - 1];
  return (last === undefined ? undefined : REPLIES[last]) ?? NUDGE;
}

/** PRD §3.7의 점수식 — 서버가 계산하는 것을 가짜가 같은 식으로 흉내 냅니다. */
export function fakeTotalScore(
  task: number,
  accuracy: number,
  expression: number,
  hints: number,
): number {
  const { weights } = missionReportFixture;
  return Math.max(
    0,
    Math.round(
      weights.task * task + weights.accuracy * accuracy + weights.expression * expression,
    ) -
      weights.hintPenalty * hints,
  );
}

export type FakePlayRecord = {
  readonly conversationId: string;
  /** 이룬 목표 id → 근거가 된 학습자 발화. */
  readonly done: ReadonlyMap<string, string>;
  readonly hintsUsed: number;
  readonly corrections: readonly { readonly original: string; readonly corrected: string }[];
  readonly utterances: readonly string[];
};

const ACCURACY = 85;

export function buildFakeReport(play: FakePlayRecord, best: number | null): MissionReport {
  const goals = missionStartFixture.goals.map((goal) => ({
    id: goal.id,
    required: goal.required,
    label: goal.label,
    done: play.done.has(goal.id),
    evidence: play.done.get(goal.id) ?? null,
  }));
  const expressions = missionReportFixture.expressions.map((entry) => ({
    ...entry,
    used: play.utterances.some((text) => text.includes(EXPRESSION_WORDS[entry.id] ?? "\u0000")),
  }));
  const task = (100 * goals.filter((goal) => goal.done).length) / goals.length;
  const expression =
    expressions.length === 0
      ? 100
      : (100 * expressions.filter((entry) => entry.used).length) / expressions.length;
  const total = fakeTotalScore(task, ACCURACY, expression, play.hintsUsed);
  const success = goals.every((goal) => !goal.required || goal.done);
  const retry = expressions
    .filter((entry) => !entry.used)
    .map((entry) =>
      entry.id === "patt:fbe5e354"
        ? missionReportFixture.retry[0]
        : { ko: "아이스 아메리카노 한 잔 주세요.", meaning: "One iced americano, please." },
    )
    .filter((entry) => entry !== undefined)
    .slice(0, 3);
  return {
    ...missionReportFixture,
    conversationId: play.conversationId,
    outcome: success ? "success" : "fail",
    endReason: success ? "goals" : "turn_limit",
    totalScore: total,
    taskScore: task,
    accuracyScore: ACCURACY,
    expressionScore: expression,
    hintsUsed: play.hintsUsed,
    goals,
    expressions,
    corrections: play.corrections.map((entry) => ({ ...entry, kind: "better" as const })),
    retry,
    summary: success
      ? missionReportFixture.summary
      : "You got part of the way. Try paying before the time runs out.",
    bestScore: best === null ? total : Math.max(best, total),
  };
}
