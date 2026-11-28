// 그림 보고 낱말 말하기 활동의 순수 로직입니다. UI를 import하지 않습니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { NonEmpty } from "../../lib/non-empty";
import type { PictureLoadState } from "../../lib/picture-load";
import { judgeSpokenAnswer } from "../../lib/speaking-judge";
import type { SpokenAnswerJudgement } from "../../lib/speaking-judge";
import {
  speechAvailabilityAfter,
  speechMissedHintOf,
  speechPhaseFor,
  speechReopened,
  speechRetryable,
} from "../../lib/speech-attempt";
import type {
  SpeechAttemptOutcome,
  SpeechAttemptPhase,
  SpeechControls,
} from "../../lib/speech-attempt";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type {
  SpeakWordQuestion,
  SpeakWordSessionAction,
  SpeakWordSessionState,
} from "./speak-word.contract";

export const initialSpeakWordSessionState: SpeakWordSessionState = {
  questionIndex: 0,
  phase: { kind: "ready" },
  availability: "open",
  heard: [],
  judgement: null,
  attempt: 0,
};

function nextQuestion(
  state: SpeakWordSessionState,
  heard: readonly (string | null)[],
): SpeakWordSessionState {
  return {
    questionIndex: state.questionIndex + 1,
    phase: speechPhaseFor(state.availability),
    availability: state.availability,
    heard,
    judgement: null,
    attempt: 0,
  };
}

/** 처음 오답이면 한 번 다시 말할 수 있습니다(시안 S4) — 두 번째 오답 · 맞음 뒤에는 없습니다. */
function canRetry(state: SpeakWordSessionState): boolean {
  return (
    state.phase.kind === "heard" && state.judgement?.result === "incorrect" && state.attempt === 0
  );
}

export function speakWordSessionReducer(
  state: SpeakWordSessionState,
  action: SpeakWordSessionAction,
): SpeakWordSessionState {
  const { phase } = state;
  switch (action.type) {
    case "start": {
      // 처음 오답 뒤 다시 말하기 — 틀린 말은 목록에서 빼고(문항당 한 칸) 같은 문항을 다시 듣습니다.
      if (canRetry(state)) {
        return {
          ...state,
          phase: { kind: "listening" },
          heard: state.heard.slice(0, -1),
          judgement: null,
          attempt: state.attempt + 1,
        };
      }
      const startable =
        phase.kind === "ready" ||
        speechRetryable(phase) ||
        (phase.kind === "unavailable" && phase.reason === "dictation-off");
      return startable ? { ...state, phase: { kind: "listening" } } : state;
    }
    case "outcome": {
      if (phase.kind !== "listening") {
        return state;
      }
      const { outcome } = action;
      return {
        ...state,
        phase: outcome,
        availability: speechAvailabilityAfter(state.availability, outcome),
        heard: outcome.kind === "heard" ? [...state.heard, outcome.text] : state.heard,
        judgement: outcome.kind === "heard" ? action.judgement : null,
      };
    }
    case "skip":
      return phase.kind === "ready" || phase.kind === "missed" || phase.kind === "unavailable"
        ? nextQuestion(state, [...state.heard, null])
        : state;
    case "next":
      return phase.kind === "heard" ? nextQuestion(state, state.heard) : state;
    case "reopen":
      return speechReopened(state);
  }
}

/** 이 활동의 남은 문항을 모두 건너뛴 들은 글자 목록입니다(ADR-0206 D4 — 이 레슨의 말하기 건너뜀). */
export function speakWordSkipRest(
  state: SpeakWordSessionState,
  total: number,
): readonly (string | null)[] {
  const rest = Math.max(0, total - state.questionIndex);
  return [...state.heard, ...new Array<null>(rest).fill(null)];
}

/**
 * 정답 중 하나라도 발음 기준으로 맞게 말했으면 정답입니다(ADR-0201) — 띄어쓰기 · 연음 · 받침 표기 · 군말 · 뒤에 덧붙은
 * 낱말은 무시하고, 긴 정답은 자모 몇 개의 오차까지 받습니다. 「통과(close)」 등급과 모범 정답은 `judgeSpokenAnswer`가 냅니다.
 */
export function judgeSpokenWord(answers: NonEmpty<string>, heard: string): AnswerResult {
  return judgeSpokenAnswer(answers, heard).result;
}

/**
 * 결말 하나의 판정입니다 — 들린 결말만 채점하고 그 밖은 null. 인식 결말 콜백(배경 스레드)에서 불러 `outcome` 동작에
 * 싣습니다. 렌더에서 부르지 않습니다(ADR-0201 개정 ⟨렌더 밖 판정⟩).
 */
export function speakWordJudgementOf(
  question: SpeakWordQuestion,
  outcome: SpeechAttemptOutcome,
): SpokenAnswerJudgement | null {
  return outcome.kind === "heard" ? judgeSpokenAnswer(question.answers, outcome.text) : null;
}

/** 지금 문항의 판정 — 들음 국면에서 받아 둔 값만 읽습니다(렌더에서 채점하지 않습니다). */
export function speakWordResultAt(state: SpeakWordSessionState): AnswerResult | null {
  return state.phase.kind === "heard" ? (state.judgement?.result ?? null) : null;
}

export function speakWordSessionResults(
  questions: readonly SpeakWordQuestion[],
  heard: readonly (string | null)[],
): readonly AnswerResult[] {
  const results: AnswerResult[] = [];
  const length = Math.min(questions.length, heard.length);
  for (let index = 0; index < length; index += 1) {
    const question = questions[index];
    const text = heard[index];
    if (question !== undefined && text !== undefined && text !== null) {
      results.push(judgeSpokenWord(question.answers, text));
    }
  }
  return results;
}

export function speakWordSkippedCount(heard: readonly (string | null)[]): number {
  return heard.filter((text) => text === null).length;
}

/** 건너뛴 문항의 자리(0부터)입니다 — 결과가 답한 문항만 담으므로 결선이 결과를 문항에 맞출 때 씁니다. */
export function speakWordSkippedIndexes(heard: readonly (string | null)[]): readonly number[] {
  return heard.flatMap((text, index) => (text === null ? [index] : []));
}

export function isSpeakWordSessionComplete(state: SpeakWordSessionState, total: number): boolean {
  return state.questionIndex >= total;
}

/** 그림이 loading이 아니면 말할 수 있습니다(실패해도 대체 글자로 말합니다). */
export function canSpeakWord(pictureState: PictureLoadState): boolean {
  return pictureState !== "loading";
}

export function speakWordControlsOf(
  phase: SpeechAttemptPhase,
  pictureState: PictureLoadState,
): SpeechControls {
  switch (phase.kind) {
    case "ready":
      return { primary: canSpeakWord(pictureState) ? "speak" : null, secondary: "skip" };
    case "listening":
      return { primary: "stop", secondary: null };
    case "heard":
      return { primary: null, secondary: null };
    // 못 알아들음 · 인식 실패는 판정이 아니라 같은 문항을 다시 말할 기회입니다(ADR-0181 · ADR-0206 D5).
    case "missed":
      return { primary: "retry", secondary: "skip" };
    case "unavailable":
      if (speechRetryable(phase)) return { primary: "retry", secondary: "skip" };
      return { primary: "skip", secondary: phase.reason === "dictation-off" ? "retry" : null };
  }
}

export function speakWordHintOf(phase: SpeechAttemptPhase, copy: UiCopy): string | null {
  if (phase.kind === "missed") {
    return speechMissedHintOf(phase.reason, copy);
  }
  if (phase.kind === "unavailable" && speechRetryable(phase)) {
    return copy.micPermission.listenFailed;
  }
  if (phase.kind === "unavailable" && phase.reason !== "dictation-off") {
    return copy.speakWord.recognitionUnavailable;
  }
  return null;
}

export function speakWordInstructionOf(
  question: SpeakWordQuestion,
  phase: SpeechAttemptPhase,
  copy: UiCopy,
): string {
  if (phase.kind === "unavailable" && phase.reason === "dictation-off") {
    return copy.speaking.dictationDisabled;
  }
  return question.instruction ?? copy.speakWord.instruction;
}

/**
 * 판정 알림(결과 시트의 live region 몫) — perfect는 판정만, close는 모범 답안, 오답은 들은 말과 정답을 잇습니다.
 * 들은 글자는 기기 안 낭독에만 쓰고 이벤트에는 싣지 않습니다.
 */
export function speakWordResultAnnouncement(
  question: SpeakWordQuestion,
  judgement: SpokenAnswerJudgement,
  heard: string,
  copy: UiCopy,
): string {
  const verdict = copy.common.resultAnnouncement(judgement.result);
  const answer = answerWithRomanization(question, judgement.expected);
  switch (judgement.grade) {
    case "perfect":
      return verdict;
    case "close":
      return `${verdict}, ${copy.speakWord.result.modelAnswer}: ${answer}`;
    case "incorrect":
      return heard.trim() === ""
        ? `${verdict}, ${copy.typing.answerReveal(answer)}`
        : `${verdict}, ${copy.speakWord.result.youSaid}: ${heard}, ${copy.typing.answerReveal(answer)}`;
  }
}

/** 정답 글자 — 첫 정답이면 로마자를 「 · 」로 잇습니다. */
function answerWithRomanization(question: SpeakWordQuestion, answer: string): string {
  return answer === question.answers[0] && question.romanization !== null
    ? `${answer} · ${question.romanization}`
    : answer;
}

export function speakWordRevealText(question: SpeakWordQuestion, copy: UiCopy): string {
  return copy.typing.answerReveal(answerWithRomanization(question, question.answers[0]));
}

/** 그림이 실패하면 틀 안 대체 글자가 같은 뜻을 보이므로 뜻 줄은 숨깁니다. */
export function speakWordMeaningShown(pictureState: PictureLoadState): boolean {
  return pictureState !== "failed";
}

export function speakWordPictureLabel(
  meaning: string,
  state: PictureLoadState,
  copy: UiCopy,
): string {
  switch (state) {
    case "loading":
      return copy.wordChoicePicture.loading;
    case "loaded":
      return copy.wordChoicePicture.picture(meaning);
    case "failed":
      return copy.wordChoicePicture.unavailable(meaning);
  }
}

export function speakWordCompletionAnnouncement(nextActionLabel: string, copy: UiCopy): string {
  return `${copy.common.allQuestionsDone}, ${nextActionLabel}`;
}

export { speakWordJudgedControls, speakWordMicStateOf } from "./speak-word-controls";
