// Letters(자모표) · 합치기 퀴즈 · Letters 추천 대화상자의 prop 계약과 testid입니다(ADR-0169). 타입만 둡니다.

import type { AutoPlayAudio } from "../../lib/question-audio";
import type { ChoiceRomanization } from "../../lib/session-options";
import type { JamoGroupId } from "../../lib/letters/jamo";
import type { LettersRecommendReason } from "../../lib/letters-recommend";

/** 화면이 소리를 내는 포트 — 음절 → 재생 주소(없으면 null = 아직 소리 없음) · 재생. 결선이 실제 재생 모듈을 꽂습니다. */
export type LetterSoundPort = {
  readonly sourceOf: (syllable: string) => string | null;
  readonly play: (source: string) => void;
};

export type LettersScreenProps = {
  readonly romanization: ChoiceRomanization;
  readonly sound: LetterSoundPort;
  readonly onPractice: () => void;
  readonly onCellTapped?: (
    letter: string,
    group: JamoGroupId,
    audio: "played" | "unavailable",
  ) => void;
};

export type LettersComposeScreenProps = {
  readonly romanization: ChoiceRomanization;
  readonly sound: LetterSoundPort;
  /**
   * 맞힌 뒤 음절을 저절로 들려 줄지(설정 Auto-play, ADR-0172) — `off`면 정답 뒤 소리만 쉬고 ▶는 그대로 납니다. 기본 `on`.
   */
  readonly autoPlay?: AutoPlayAudio;
  readonly onExit: () => void;
  /** 판정마다 — round는 1부터. */
  readonly onAnswered?: (round: number, target: string, correct: boolean) => void;
  readonly onComplete?: (rounds: number, firstTry: number) => void;
};

export type LettersRecommendDialogProps = {
  readonly reason: LettersRecommendReason;
  readonly onLearn: () => void;
  /** Keep going(keep_going) · 시스템 뒤로(back). */
  readonly onLater: (choice: "keep_going" | "back") => void;
};

export const lettersTestIds = {
  screen: "letters-screen",
  practice: "letters-practice",
  cell: (index: number) => `letters-cell-${index}`,
  compose: "letters-compose",
  composePlay: "compose-play",
  composeSlot: (slot: "c" | "v" | "r") => `compose-slot-${slot}`,
  composeTile: (index: number) => `compose-tile-${index}`,
  composeHint: "compose-hint",
  composeHintText: "compose-hint-text",
  recommend: "letters-recommend",
} as const;
