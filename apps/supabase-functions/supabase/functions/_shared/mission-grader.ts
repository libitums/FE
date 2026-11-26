// 미션 채점(ADR-0193 D5, PRD §3.7) — 판이 끝난 뒤 상위 모델을 한 번 부르는 user 글과, 받은 결과를 리포트 값으로 다듬는 함수.
// 프롬프트 · 스키마는 `mission-grader-prompt.ts`. 최종 점수는 모델이 아니라 `scoreMission`이 계산한다. 목표의 최종 달성 = 턴에서
// 쌓인 것 ∪ 채점자가 찾은 것(PRD M4). 고친 문장은 턴마다 저장된 교정을 그대로 쓰고, 채점자는 그중 중요한 것을 번호로 고른다. 순수 모듈이다.

import type { MissionEndReason, MissionReport } from "./companion-contract/index.ts";
import type { MissionDefinition } from "./mission-definition.ts";
import { graderUserTemplate, type GraderDraft } from "./mission-grader-prompt.ts";
import {
  scoreMission,
  scoreParts,
  type MissionScore,
  type MissionScoring,
} from "./mission-score.ts";
import { fillTemplate } from "./mission-template.ts";

export {
  graderSchema,
  graderSystem,
  graderUserTemplate,
  type GraderDraft,
} from "./mission-grader-prompt.ts";

/** 리포트에 남기는 개수 상한. */
export const missionReportLimits = { retry: 3, focus: 3, strengths: 2 } as const;

/** 판의 교정 하나(`companion.corrections`에서 모은 것). `reason`은 교정 조각의 까닭을 이은 글(학습자 언어). */
export type MissionCorrection = {
  readonly original: string;
  readonly corrected: string;
  readonly kind: "correction" | "better" | "l1_to_ko" | null;
  readonly reason?: string | null;
};

export type GraderInput = {
  readonly mission: MissionDefinition;
  /** `missionBrief(mission)`. */
  readonly brief: string;
  /** `missionTranscript(mission, …)`. */
  readonly transcript: string;
  readonly corrections: readonly MissionCorrection[];
  readonly turnGoalsDone: readonly string[];
  readonly l1: string | null;
};

/** 고치기(fix) — 틀린 것. 「더 나은 표현」(kind better)은 점수 · 꼭 볼 고친 문장에 쓰지 않는다(2026-11-23 사용자 결정). */
export const isFix = (correction: MissionCorrection) => correction.kind !== "better";

/** 채점 입력의 교정 목록 — 1부터 매긴 번호(`n`)를 채점자가 `focus.refs`로 되돌려 준다. 호출하는 쪽이 고치기만 넘긴다. */
export function correctionsForGrader(corrections: readonly MissionCorrection[]) {
  return corrections.map(({ original, corrected, kind, reason }, index) => ({
    n: index + 1,
    original,
    corrected,
    kind,
    reason: reason ?? null,
  }));
}

/** 채점 호출의 user 글. */
export function graderUser(input: GraderInput): string {
  const json = (value: unknown) => JSON.stringify(value);
  return fillTemplate(graderUserTemplate, {
    mission_brief: input.brief,
    goals_json: json(
      input.mission.goals.map(({ id, required, criteria }) => ({ id, required, criteria })),
    ),
    target_expressions_json: json(input.mission.targetExpressions),
    turn_goals_done_json: json(input.turnGoalsDone),
    corrections_json: json(correctionsForGrader(input.corrections)),
    transcript: input.transcript,
    learner_l1: input.l1 ?? "en",
    learner_register: learnerRegisterLine(input.mission),
  });
}

/** 채점자에게 주는 장면의 기대 화계 한 줄(미션 파일 `counterpart.learnerRegister`, 없으면 polite). */
export function learnerRegisterLine(mission: MissionDefinition): string {
  const register = mission.counterpart.learnerRegister ?? "polite";
  const word = register === "polite" ? "polite (존댓말: -요 / -습니다)" : "casual (반말)";
  const note = mission.counterpart.learnerRegisterNote;
  return note === undefined ? word : `${word} — ${note}`;
}

/**
 * 화계 상한(2026-11-23 사용자 결정 — 내내 어긋남 = 50, 절반 = 75, 다섯 중 하나 = 90). 화계가 드러난 턴이 없으면 상한 없음(100).
 * 채점자가 낸 턴 수로 코드가 다시 걸어 재채점 흔들림을 줄인다.
 */
export function registerCap(turns: number, mismatch: number): number {
  if (!Number.isFinite(turns) || turns <= 0) return 100;
  const share = Math.min(1, Math.max(0, (Number.isFinite(mismatch) ? mismatch : 0) / turns));
  return Math.round(100 - 50 * share);
}

type Line = { readonly ko: string; readonly meaning: string };

export type MissionGrade = {
  readonly goals: MissionReport["goals"];
  readonly expressions: MissionReport["expressions"];
  readonly retry: readonly Line[];
  readonly summary: string;
  readonly headline: string;
  readonly nextStep: string;
  readonly strengths: readonly { readonly quote: string; readonly note: string }[];
  /** 채점자가 고른 교정 묶음 — `refs`는 입력 교정의 번호(1부터), 범위 밖 번호는 버렸다. */
  readonly focus: readonly { readonly refs: readonly number[]; readonly reason: string }[];
  readonly accuracyNotes: string;
  /** 화계(2026-11-23) — 화계가 드러난 학습자 턴 · 어긋난 턴 · 그로 걸린 정확도 상한 · 채점자의 메모. */
  readonly register: { turns: number; mismatch: number; cap: number; notes: string };
  readonly score: MissionScore;
};

const trimLine = (entry: Line | null | undefined): Line | null =>
  entry && entry.ko.trim() !== "" ? { ko: entry.ko.trim(), meaning: entry.meaning.trim() } : null;

/**
 * 채점 결과 → 리포트 값. 모르는 목표 · 표현 id는 버리고, 빠진 것은 미달성 · 미사용으로 둔다. 목표의 최종 달성은
 * 턴에서 쌓인 것 ∪ 채점자가 done이라 한 것, 「이렇게 말하면 됐어요」(`tip`)는 최종으로 못 이룬 목표에만 남긴다. 정확도는 0 ~ 100
 * 정수로 자르고, 다시 해 볼 표현은 빈 줄을 빼고 셋까지 — 채점자가 하나도 내지 않았으면 못 쓴 목표 표현으로 채운다.
 * 교정 묶음은 입력 교정 수(`correctionCount`) 안의 번호만, 묶음 셋 · 잘한 점 둘까지.
 */
export function normalizeGrade(
  mission: MissionDefinition,
  draft: GraderDraft,
  context: {
    readonly turnGoalsDone: readonly string[];
    readonly hintsUsed: number;
    readonly scoring?: MissionScoring;
    readonly correctionCount?: number;
  },
): MissionGrade {
  const graded = new Map(draft.goals.map((goal) => [goal.id.trim(), goal]));
  const goals = mission.goals.map((goal) => {
    const verdict = graded.get(goal.id);
    const graderDone = verdict?.done === true;
    const done = graderDone || context.turnGoalsDone.includes(goal.id);
    return {
      id: goal.id,
      required: goal.required,
      label: goal.label,
      done,
      evidence: graderDone ? verdict?.evidence?.trim() || null : null,
      tip: done ? null : trimLine(verdict?.tip),
    };
  });
  const used = new Set(
    draft.expressions.filter((entry) => entry.used).map((entry) => entry.id.trim()),
  );
  const expressions = mission.targetExpressions.map((entry) => ({
    id: entry.id,
    ko: entry.ko,
    meaning: entry.meaning,
    used: used.has(entry.id),
  }));
  const retry = draft.retry
    .map(trimLine)
    .filter((entry): entry is Line => entry !== null)
    .slice(0, missionReportLimits.retry);
  const fallback = expressions
    .filter((entry) => !entry.used)
    .map((entry) => ({ ko: entry.ko, meaning: entry.meaning }))
    .slice(0, missionReportLimits.retry);
  const count = context.correctionCount ?? 0;
  const focus = draft.focus
    .map((entry) => ({
      refs: [...new Set(entry.refs.filter((n) => Number.isInteger(n) && n >= 1 && n <= count))],
      reason: entry.reason.trim(),
    }))
    .filter((entry) => entry.refs.length > 0)
    .slice(0, missionReportLimits.focus);
  const strengths = draft.strengths
    .map((entry) => ({ quote: entry.quote.trim(), note: entry.note.trim() }))
    .filter((entry) => entry.quote !== "" && entry.note !== "")
    .slice(0, missionReportLimits.strengths);
  const raw = Number.isFinite(draft.accuracy)
    ? Math.round(Math.min(100, Math.max(0, draft.accuracy)))
    : 0;
  const cap = registerCap(draft.registerTurns, draft.registerMismatchTurns);
  const accuracy = Math.min(raw, cap);
  const score = scoreMission(
    {
      goals,
      accuracy,
      expressionsUsed: expressions.filter((entry) => entry.used).length,
      expressionsTotal: expressions.length,
      hintsUsed: context.hintsUsed,
    },
    context.scoring,
  );
  return {
    goals,
    expressions,
    retry: retry.length > 0 ? retry : fallback,
    summary: draft.summary.trim(),
    headline: draft.headline.trim(),
    nextStep: draft.nextStep.trim(),
    strengths,
    focus,
    accuracyNotes: draft.accuracyNotes.trim(),
    register: {
      turns: Math.max(0, Math.round(draft.registerTurns || 0)),
      mismatch: Math.max(0, Math.round(draft.registerMismatchTurns || 0)),
      cap,
      notes: draft.registerNotes.trim(),
    },
    score,
  };
}

/**
 * 교정 묶음(번호) → 리포트의 「꼭 볼 고친 문장」(원문 → 고친 문장은 턴 교정 그대로, 까닭은 채점자의 한 줄). `corrections`는 채점자에게
 * 넘긴 목록(고치기만 — 번호가 이 목록 기준)이다. 그래도 「더 나은 표현」(kind better)을 가리키는 번호는 버리고, 그래서 빈 묶음은 뺀다
 * (2026-11-23 — Key corrections는 고치기만, 더 나은 표현은 「Sounds more natural」에만).
 */
export function focusCorrections(
  focus: MissionGrade["focus"],
  corrections: readonly MissionCorrection[],
): NonNullable<MissionReport["focus"]> {
  return focus
    .map((entry) => ({
      examples: entry.refs.flatMap((n) => {
        const hit = corrections[n - 1];
        return hit === undefined || !isFix(hit)
          ? []
          : [{ original: hit.original, corrected: hit.corrected }];
      }),
      reason: entry.reason,
    }))
    .filter((entry) => entry.examples.length > 0);
}

/** 다듬은 채점 + 판의 메타 → 리포트(계약 `missionReportSchema`). `previousBest`는 이 판 앞의 이 미션 최고 기록. */
export function buildMissionReport(input: {
  readonly conversationId: string;
  readonly mission: MissionDefinition;
  readonly grade: MissionGrade;
  readonly endReason: MissionEndReason;
  readonly hintsUsed: number;
  readonly scoring: MissionScoring;
  readonly corrections: readonly MissionCorrection[];
  readonly previousBest: number | null;
  readonly graderModel: string;
  readonly createdAt: string;
}): MissionReport {
  const { grade, scoring } = input;
  return {
    conversationId: input.conversationId,
    missionId: input.mission.id,
    missionVersion: input.mission.version,
    outcome: grade.score.outcome,
    endReason: input.endReason,
    totalScore: grade.score.total,
    taskScore: grade.score.task,
    accuracyScore: grade.score.accuracy,
    expressionScore: grade.score.expression,
    hintsUsed: input.hintsUsed,
    weights: { ...scoring.weights, hintPenalty: scoring.hintPenalty },
    scoreParts: scoreParts(grade.score, input.hintsUsed, scoring),
    headline: grade.headline,
    goals: grade.goals,
    expressions: grade.expressions,
    corrections: input.corrections.map(({ original, corrected, kind }) => ({
      original,
      corrected,
      kind,
    })),
    // 번호는 채점자에게 넘긴 고치기 목록 기준(mission-finish-handler와 같다).
    focus: focusCorrections(grade.focus, input.corrections.filter(isFix)),
    strengths: [...grade.strengths],
    retry: [...grade.retry],
    summary: grade.summary,
    nextStep: grade.nextStep,
    bestScore: Math.max(input.previousBest ?? 0, grade.score.total),
    graderModel: input.graderModel,
    createdAt: input.createdAt,
  };
}
