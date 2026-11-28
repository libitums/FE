// 가짜 출처의 규칙 — 미션 대본(`mission-fake-scripts.ts`)마다의 낱말 판정 · 상대역 대사 · 교정(고치기 / 더 나은 표현) · 받아 적기 · 리포트 계산입니다.
// 서버(상태 줄 · 채점 모델 · Scribe)의 흉내일 뿐 앱의 판정이 아닙니다 — 서버 구현이 붙으면 이 파일은 개발 미리보기 · 테스트에서만 돕니다.

import { missionReportFixture } from "./mission-fixture";
import type { FakeFix, FakeMissionScript } from "./mission-fake-scripts";
import type { MissionAutoSendReason, MissionTranscript } from "./mission-voice.contract";
import type { MissionEndReason, MissionReport } from "./roleplay-mission.contract";

type FakeLine = { readonly ko: string; readonly en: string };

/**
 * 6화의 가짜 대본 — 한국어는 학습 내용(상대역 대사 · 판정 낱말 · 교정 · 받아 적은 말)이라 문구표가 아니라 이 한 선언에 모읍니다
 * (`devtools/ui-copy-literals/policy.mjs`의 학습 콘텐츠 허용 목록).
 */
export const FAKE_CAFE_SCRIPT = {
  /** 목표마다 이룬 것으로 볼 낱말(하나라도 들면 이룸). */
  goalWords: {
    order: ["주세요", "한 잔", "아메리카노", "라떼", "커피"],
    pay: ["카드", "현금", "계좌"],
    stay: ["가지고 가", "포장", "먹고 갈", "마시고 갈", "여기서"],
    price: ["얼마"],
  } as Readonly<Record<string, readonly string[]>>,
  /** 목표 표현마다 쓴 것으로 볼 낱말. */
  expressionWords: { "patt:83586289": "한 잔", "patt:fbe5e354": "얼마" } as Readonly<
    Record<string, string>
  >,
  replies: {
    order: {
      ko: "네, 아이스 아메리카노 한 잔이요. 드시고 가세요?",
      en: "Sure, one iced americano. For here?",
    },
    stay: { ko: "알겠습니다. 결제는 어떻게 하시겠어요?", en: "Got it. How would you like to pay?" },
    pay: { ko: "네, 카드 받았습니다.", en: "Okay, I've got your card." },
    price: { ko: "오천 원이에요.", en: "It's five thousand won." },
  } as Readonly<Record<string, FakeLine>>,
  nudge: { ko: "음료는 뭘로 드릴까요?", en: "What would you like to drink?" },
  closing: {
    ko: "감사합니다. 나오면 불러 드릴게요!",
    en: "Thank you. I'll call you when it's ready!",
  },
  timeUp: {
    ko: "죄송해요, 뒤에 손님이 기다리셔서요. 다음에 또 오세요!",
    en: "Sorry, there are customers waiting. Please come again!",
  },
  /** 턴 교정 — 고치기(틀린 말)와 더 나은 표현(맞지만 더 자연스러운 말, 점수와 무관). */
  fixes: [
    {
      kind: "better",
      from: "가지고 가요",
      to: "포장이요",
      reason: "At a café, 포장이요 is the usual way to say take-out.",
    },
    {
      kind: "correction",
      from: "카드으로",
      to: "카드로",
      reason: "After a vowel, use 로 instead of 으로.",
    },
  ] as readonly FakeFix[],
  /** 고치기 묶음의 한 줄(채점자의 `focus[].reason` 흉내). */
  focusReason: "After a vowel, use 로.",
  orderRetry: { ko: "아이스 아메리카노 한 잔 주세요.", meaning: "One iced americano, please." },
  /** 마이크를 누를 때마다 차례로 받아 적는 말(서버 판단 흉내) — 둘째는 확신도가 낮아 입력 칸에서 확인합니다. */
  heard: [
    { text: "아이스 아메리카노 한 잔 주세요.", autoSend: true, reason: "ok" },
    { text: "가지고 가요.", autoSend: false, reason: "low_confidence" },
    { text: "카드로 할게요.", autoSend: true, reason: "ok" },
  ] as readonly { text: string; autoSend: boolean; reason: MissionAutoSendReason }[],
} as const;

/** 계약 모양(`MissionSttResponse`)의 가짜 받아 적기 — 낱말 · 판단 재료는 그럴듯한 고정값입니다. */
export function fakeHeard(
  text: string,
  autoSend: boolean,
  reason: MissionAutoSendReason,
): MissionTranscript {
  const chars = text.replace(/[\s.,!?]/g, "").length;
  return {
    kind: "heard",
    text,
    autoSend,
    reason,
    words: text
      .split(" ")
      .map((word) => ({ text: word, start: null, end: null, confidence: null })),
    features: { confMin: null, confMean: null, chars, hangulRatio: null, seconds: 1.6 },
    latencyMs: 0,
  };
}

export function goalsReachedBy(script: FakeMissionScript, text: string): readonly string[] {
  return script.start.goals
    .map((goal) => goal.id)
    .filter((id) => (script.goalWords[id] ?? []).some((word) => text.includes(word)));
}

/** 이 글에 붙을 턴 교정 — 대본의 표현이 들었으면 그것, 아니면 없음. */
export function fakeFixOf(script: FakeMissionScript, text: string): FakeFix | null {
  return script.fixes.find((fix) => text.includes(fix.from)) ?? null;
}

/** 상대역의 답 — 끝이면 마무리 대사, 아니면 방금 이룬 목표에 맞춘 말, 아무것도 못 이뤘으면 되돌리는 말. */
export function fakeReplyOf(
  script: FakeMissionScript,
  reached: readonly string[],
  ended: MissionEndReason | null,
): FakeLine {
  if (ended === "goals") return script.closing;
  if (ended === "turn_limit") return script.timeUp;
  const last = reached[reached.length - 1];
  return (last === undefined ? undefined : script.replies[last]) ?? script.nudge;
}

const tenth = (value: number): number => Math.round(value * 10) / 10;

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

export type FakeCorrection = {
  readonly original: string;
  readonly corrected: string;
  readonly kind: "correction" | "better";
  readonly items: readonly { original: string; corrected: string; reason: string }[];
};

export type FakePlayRecord = {
  readonly conversationId: string;
  /** 이룬 목표 id → 근거가 된 학습자 발화. */
  readonly done: ReadonlyMap<string, string>;
  readonly hintsUsed: number;
  readonly corrections: readonly FakeCorrection[];
  readonly utterances: readonly string[];
  readonly endReason: MissionEndReason;
};

const ACCURACY = 85;

export function buildFakeReport(
  script: FakeMissionScript,
  play: FakePlayRecord,
  best: number | null,
): MissionReport {
  const { base } = script.report;
  const goals = script.start.goals.map((goal) => {
    const done = play.done.has(goal.id);
    const example = script.hintExamples[goal.id];
    return {
      id: goal.id,
      required: goal.required,
      label: goal.label,
      done,
      evidence: play.done.get(goal.id) ?? null,
      tip: done || example === undefined ? null : { ko: example.ko, meaning: example.meaning },
    };
  });
  const expressions = script.report.expressions.map((entry) => ({
    ...entry,
    used: play.utterances.some((text) =>
      text.includes(script.expressionWords[entry.id] ?? "\u0000"),
    ),
  }));
  const task = (100 * goals.filter((goal) => goal.done).length) / goals.length;
  const expression =
    expressions.length === 0
      ? 100
      : (100 * expressions.filter((entry) => entry.used).length) / expressions.length;
  const { weights } = base;
  const total = fakeTotalScore(task, ACCURACY, expression, play.hintsUsed);
  const success = goals.every((goal) => !goal.required || goal.done);
  const retry = expressions
    .filter((entry) => !entry.used)
    .map((entry) => script.report.retryFor[entry.id])
    .filter((entry) => entry !== undefined)
    .slice(0, 3);
  const fixes = play.corrections.filter((entry) => entry.kind === "correction");
  const strength = play.done.get(script.report.strengthGoal);
  return {
    ...base,
    conversationId: play.conversationId,
    outcome: success ? "success" : "fail",
    endReason: play.endReason,
    totalScore: total,
    taskScore: task,
    accuracyScore: ACCURACY,
    expressionScore: expression,
    hintsUsed: play.hintsUsed,
    scoreParts: {
      task: tenth(weights.task * task),
      accuracy: tenth(weights.accuracy * ACCURACY),
      expression: tenth(weights.expression * expression),
      hintPenalty: weights.hintPenalty * play.hintsUsed,
    },
    headline: success ? script.report.headline.success : script.report.headline.fail,
    goals,
    expressions,
    corrections: play.corrections.map((entry) => ({ ...entry, items: [...entry.items] })),
    focus:
      fixes.length === 0
        ? []
        : [
            {
              examples: fixes.map(({ original, corrected }) => ({ original, corrected })),
              reason: script.focusReason,
            },
          ],
    strengths:
      strength === undefined ? [] : [{ quote: strength, note: script.report.strengthNote }],
    retry,
    summary: success ? script.report.summary.success : script.report.summary.fail,
    nextStep: script.report.nextStep,
    bestScore: best === null ? total : Math.max(best, total),
  };
}
