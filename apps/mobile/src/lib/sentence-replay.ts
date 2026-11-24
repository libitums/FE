// 지나간 한국어 문장을 다시 듣는 단추와 칩 소리의 순수 판정입니다(ADR-0188). 화면 경로에 실리므로 값 import가 없습니다.

import type { QuestionAudio } from "./question-audio";

export type { ChipSoundSurface, LessonSoundUse } from "./question-audio";

/** 다시 듣기 단추 하나의 상태 — 소리가 있으면 그 주소, 없으면 회색(누를 수 없음, ADR-0173과 같은 원칙). */
export type SentenceReplay =
  | { readonly kind: "available"; readonly source: string }
  | { readonly kind: "unavailable" };

/** 재생 주소(없으면 `null` · `undefined` · 빈 글)에서 단추 상태를 냅니다. */
export function sentenceReplayOf(source: string | null | undefined): SentenceReplay {
  return source === null || source === undefined || source === ""
    ? { kind: "unavailable" }
    : { kind: "available", source };
}

/**
 * 레슨 판정 뒤 정답 문장의 다시 듣기입니다. 판정 전이면 `null`(단추 없음 — 정답을 미리 들려주지 않음). 듣기 갈래 문항은
 * 정답 음성(`echo`)이 없으면 `null` — 위 줄의 듣기 조작이 이미 다시 듣기를 집니다.
 */
export function answerReplayOf(
  audio: QuestionAudio | null | undefined,
  judged: boolean,
): SentenceReplay | null {
  if (!judged) return null;
  if (audio?.kind === "listen" && audio.echo === undefined) return null;
  const echo = audio?.kind === "answer-echo" ? audio : audio?.echo;
  return sentenceReplayOf(echo?.source);
}

/** 칩 `index`의 소리 주소입니다. 목록이 없거나 그 칩에 소리가 없으면 `null`. */
export function chipSoundAt(
  chipAudio: readonly (string | null)[] | undefined,
  index: number,
): string | null {
  if (chipAudio === undefined || index < 0) return null;
  return chipAudio[index] ?? null;
}
