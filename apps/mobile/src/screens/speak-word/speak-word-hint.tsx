// 낱말 말하기의 힌트입니다(사용자 결정 2026-11-23 — 판정 전 로마자를 숨기고 「Hint」로 보임). 조립 문항 힌트(ADR-0153)의
// 버튼 · 시트 · 기록(`hintUsed`)을 그대로 씁니다. 「정답 보기」는 정답 로마자 줄을, 「정답 듣기」는 정답 소리를 한 번 냅니다.

import type { ReactNode } from "@lynx-js/react";

import {
  AssembledHintButton,
  AssembledHintSheet,
  useAssembledHint,
} from "../../components/assembled-hint/AssembledHint";
import type { AssembledHintState } from "../../components/assembled-hint/AssembledHint";
import type { AssembledHint } from "../../components/assembled-hint/assembled-hint.contract";
import { TextRoles } from "../../components/TextRoles";
import { romanizationSegmentsOf } from "../../lib/romanization-segments";
import type { SpeechAttemptPhase } from "../../lib/speech-attempt";
import type { SpeakWordQuestion } from "./speak-word.contract";

/** 문항의 힌트 — 로마자가 없으면 힌트가 없습니다(정답 보기가 보일 것이 없음). 정답 소리가 있으면 「정답 듣기」도 섭니다. */
export function speakWordHintFor(
  question: SpeakWordQuestion | null | undefined,
): AssembledHint | undefined {
  if (question == null || question.romanization === null) return undefined;
  const source = question.audio?.source;
  return source === undefined
    ? { ghost: [question.romanization] }
    : { ghost: [question.romanization], listenSource: source };
}

export type SpeakWordHint = {
  readonly hint: AssembledHint | undefined;
  readonly state: AssembledHintState;
};

export function useSpeakWordHint(
  question: SpeakWordQuestion | null | undefined,
  questionIndex: number,
): SpeakWordHint {
  return { hint: speakWordHintFor(question), state: useAssembledHint(String(questionIndex)) };
}

/** 판정 · 보고에 싣는 기록 — 쓰지 않았으면 키가 없습니다. */
export function hintUsedOf({ state }: SpeakWordHint): { readonly hintUsed?: "listen" | "show" } {
  return state.used === null ? {} : { hintUsed: state.used };
}

/** 그림 위 오른쪽의 「Hint」 버튼 — 준비 국면에서만 섭니다(듣는 중 · 판정 뒤 · 불가에는 없음). */
export function SpeakWordHintButton({
  hint,
  phase,
}: {
  readonly hint: SpeakWordHint;
  readonly phase: SpeechAttemptPhase;
}): ReactNode {
  if (hint.hint === undefined || phase.kind !== "ready") return null;
  return <AssembledHintButton onOpen={hint.state.openSheet} />;
}

/** 「정답 보기」를 고른 뒤 그림 아래 정답 로마자 줄 — 판정이 나면 정답 상자가 대신합니다. */
export function SpeakWordHintLine({
  hint,
  judged,
}: {
  readonly hint: SpeakWordHint;
  readonly judged: boolean;
}): ReactNode {
  const romanization = hint.hint?.ghost[0];
  if (judged || hint.state.used !== "show" || romanization === undefined) return null;
  return (
    <TextRoles.Romanization
      segments={romanizationSegmentsOf(romanization, undefined)}
      size="m"
      testId="speak-word-romanization"
    />
  );
}

/** 시트는 활동 맨 바깥(셸 형제)에 섭니다 — 스크롤 안에 두면 잘립니다. */
export function SpeakWordHintSheet({ hint }: { readonly hint: SpeakWordHint }): ReactNode {
  return hint.hint === undefined ? null : (
    <AssembledHintSheet hint={hint.hint} state={hint.state} />
  );
}
