// 입장 전 기초 세 화면의 prop 계약 · 문구 · testid입니다(ADR-0176).

import type { AutoPlayAudio } from "../../lib/question-audio";
import type { ChoiceRomanization } from "../../lib/session-options";
import type { LetterSoundPort } from "../../lib/letters/letter-sound.contract";
import type { SafeAreaInsets } from "../../lib/safe-area";

export type EntryBasicsStepProps = {
  readonly onNext: () => void;
  readonly onBack: () => void;
  readonly onSkip: () => void;
};

export type EntryBasicsLettersScreenProps = EntryBasicsStepProps & {
  readonly sound: LetterSoundPort;
};

export type EntryBasicsComposeScreenProps = EntryBasicsStepProps & {
  readonly romanization: ChoiceRomanization;
  readonly sound: LetterSoundPort;
  readonly autoPlay: AutoPlayAudio;
};

export type EntryBasicsReadyScreenProps = {
  /** 셸이 여백을 잡지 않습니다 — 그림 바탕색이 화면 끝까지 갑니다. */
  readonly safeArea: Pick<SafeAreaInsets, "top" | "bottom">;
  /** 튜토리얼 표지 그림. 없으면 그림 없이 나머지가 그대로 섭니다. */
  readonly planeUrl: string | null;
  readonly onNext: () => void;
  readonly onBack: () => void;
};

/** `UiCopy.journeyEntry.firstSteps`. 자음 · 모음 · 합치기 문구는 `more`의 것을 씁니다. */
export type EntryBasicsCopy = {
  readonly progress: (current: number, total: number) => string;
  readonly lettersTitle: string;
  readonly lettersLead: string;
  /** 여섯 소리가 다 있을 때만 덧붙는 문장입니다. */
  readonly lettersHear: string;
  readonly lettersNext: string;
  readonly readyTitle: string;
  /** 「너도 가?」의 뜻 — 친구 사이 말투입니다. */
  readonly readyMeaning: string;
  readonly readyBody: string;
  /** 「너도 가?」에 답하는 말로 읽히는 단추입니다. */
  readonly readyGo: string;
};

export const entryBasicsTestIds = {
  letters: "entry-basics-letters",
  compose: "entry-basics-compose",
  ready: "entry-basics-ready",
  back: "entry-basics-back",
  progress: "entry-step-bar",
  skip: "entry-basics-skip",
  next: "entry-basics-next",
  title: "entry-basics-title",
  lead: "entry-basics-lead",
  letter: (index: number) => `entry-basics-letter-${index}`,
  sentence: "entry-basics-sentence",
  word: (index: number) => `entry-basics-word-${index}`,
  meaning: "entry-basics-meaning",
  plane: "entry-basics-plane",
} as const;
