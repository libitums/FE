// 미션 턴 결과의 코드 쪽 거르개(ADR-0177 D13) — 모델이 프롬프트를 다 지키지 않는 두 곳을 코드가 막습니다. 순수 함수입니다.
//
// 1. 작별 인사: 판이 열려 있는데(장면을 닫는 턴이 아님) 상대역 답의 말에 작별 인사(「안녕히 가세요」 류)가 있으면 그 문장을 뺍니다.
//    QA: 학습자가 꺼낼 선택 목표만 남았을 때 Haiku가 「감사합니다. 안녕히 가세요.」로 인사해 버렸다(2/2). 인사말은 미션 파일의
//    `counterpart.farewells`, 없으면 `defaultFarewells`. 빼고 나서 말이 하나도 안 남으면 호출하는 쪽이 한 번만 다시 만든다.
// 2. 교정의 비한글 문자: 미션 턴 교정의 고친 문장에 원문에 없는 한자 · 가나 · 그 밖의 한글 · 라틴이 아닌 글자가 있으면 그 교정을
//    버립니다(교정 없음). QA: 「마실게요」 → 「마实 할게요」. 1단계 교정 함수는 그대로 두고 미션 쪽에서만 감쌉니다.

import type { Feedback, Segment } from "./chat-send.contract.ts";
import { emptyFeedback } from "./companion-llm-prompts.ts";
import type { MissionDefinition } from "./mission-definition.ts";

/** 미션 파일에 인사말이 없을 때의 작별 인사(문장 안에 들어 있으면 작별로 본다). */
export const defaultFarewells = [
  "안녕히 가세요",
  "안녕히 가십시오",
  "또 오세요",
  "또 오십시오",
  "좋은 하루 보내세요",
  "다음에 또 뵐게요",
] as const;

export const farewellsOf = (mission: MissionDefinition): readonly string[] =>
  mission.counterpart.farewells ?? defaultFarewells;

const sentences = (text: string): string[] =>
  text.match(/[^.!?。！？]+[.!?。！？]*\s*/g)?.map((part) => part) ?? [text];

/**
 * 작별 인사 문장을 뺀 조각들. 말(`speech`) 조각 안에서 인사가 든 문장만 빼고, 빈 조각은 버린다. 행동 조각은 그대로.
 * `stripped`는 하나라도 뺐는가, `speechLeft`는 말 조각이 남았는가.
 */
export function stripFarewells(
  segments: readonly Segment[],
  farewells: readonly string[],
): { segments: Segment[]; stripped: boolean; speechLeft: boolean } {
  let stripped = false;
  const out: Segment[] = [];
  for (const segment of segments) {
    if (segment.kind !== "speech") {
      out.push(segment);
      continue;
    }
    const kept = sentences(segment.text).filter((part) => {
      const bye = farewells.some((word) => part.includes(word));
      if (bye) stripped = true;
      return !bye;
    });
    const text = kept.join("").trim();
    if (text !== "") out.push({ ...segment, text });
  }
  return { segments: out, stripped, speechLeft: out.some((segment) => segment.kind === "speech") };
}

/**
 * 이번 답에 작별 인사를 걸러야 할 수 있는가 — 학습자가 꺼낼 목표가 남았고 상대역이 꺼낼 남은 목표가 하나 이하일 때(QA에서 인사가 나온 상태).
 * 이때만 성인 턴도 답을 모아 두었다가(스트리밍하지 않고) 거른 뒤 보낸다.
 */
export function farewellRisk(mission: MissionDefinition, goalsDone: readonly string[]): boolean {
  const open = mission.goals.filter((goal) => !goalsDone.includes(goal.id));
  const learnerOpen = open.filter((goal) => goal.opener === "learner").length;
  const counterpartOpen = open.length - learnerOpen;
  return learnerOpen > 0 && counterpartOpen <= 1;
}

/** 한글 · 라틴이 아닌 글자(한자 · 가나 · 키릴 …). 숫자 · 문장 부호 · 공백은 글자가 아니라 걸리지 않는다. */
const foreignLetter = /(?![\p{Script=Hangul}\p{Script=Latin}])\p{L}/gu;

/** `text`에 있고 `original`에 없는 비한글 글자. */
export function newForeignLetters(text: string, original: string): string[] {
  const allowed = new Set(original.match(foreignLetter) ?? []);
  return [...new Set((text.match(foreignLetter) ?? []).filter((letter) => !allowed.has(letter)))];
}

/** 미션 턴 교정 거르기 — 고친 문장 · 고친 표현 · 더 나은 표현에 원문에 없는 비한글 글자가 있으면 교정 없음(`none`). */
export function guardMissionFeedback(
  feedback: Feedback,
  original: string,
): { feedback: Feedback; dropped: string[] } {
  if (feedback.status !== "ok") return { feedback, dropped: [] };
  const texts = [
    feedback.corrected ?? "",
    ...feedback.items.map((item) => item.corrected),
    feedback.better?.text ?? "",
  ];
  const dropped = [...new Set(texts.flatMap((text) => newForeignLetters(text, original)))];
  if (dropped.length === 0) return { feedback, dropped };
  return { feedback: { ...emptyFeedback("none", original) }, dropped };
}
