// 에피소드 최종 테스트의 타입입니다. 값 · JSX · 스타일은 이 파일에 두지 않습니다.
//
// 최종 테스트는 에피소드의 마지막 유닛입니다. 서사에 주입된 내용과 에피소드 중간에 배운
// 표현을 모아, 서사 장면 위에서 문항을 풀고 에피소드를 끝냅니다(Figma 79-6484 말하기 ·
// 79-6648 낱말 고르기).

import type { EpisodeFinalStory } from "./episode-final-story.contract";
import type { AnswerResult } from "../../lib/answer-result";
import type { SafeAreaInsets } from "../../lib/safe-area";
import type { WritingQuestion } from "../../lib/writing-session";
import type { JourneyMapItemStatus } from "../journey-map/journey-map-units";

export type EpisodeFinalUnitId = "tutorial-final-test";
export type EpisodeFinalTitle = "Final test";

/** 따라 말하는 문항입니다(Figma 79-6484). 채점은 말하기 학습형과 같은 규칙입니다. */
export type EpisodeFinalSpeakingQuestion = {
  readonly kind: "speaking";
  readonly id: string;
  /** 따라 말할 문장입니다. 낱말은 공백으로 가릅니다. */
  readonly sentence: string;
  /** 발음 표기입니다 — 대괄호까지 값에 담습니다(`[i.ɡʌ.ju.se.jo]`). */
  readonly romanization: string;
};

/**
 * 빈칸을 고르는 문항입니다(Figma 79-6648). 문장은 빈칸 앞 · 뒤로 나눠 적습니다 — 빈칸
 * 표시(`_ _ _`)는 화면이 그립니다. 문장은 서사의 대사처럼 대화 패널에 서므로 말하는 사람을
 * 함께 적습니다.
 */
export type EpisodeFinalWordChoiceQuestion = {
  readonly kind: "word-choice";
  readonly id: string;
  /** 이 대사를 하는 사람입니다 — 서사의 인물 이름, 학습자 자신이면 `나`입니다. */
  readonly speakerName: string;
  readonly before: string;
  readonly after: string;
  /** 문장 전체의 번역입니다. */
  readonly translation: string;
  readonly options: readonly [string, string, string];
  /** 정답 보기의 자리(0부터)입니다. */
  readonly answerIndex: 0 | 1 | 2;
  readonly romanizations?: readonly [string, string, string];
  /** 문항이 벌어지는 상황. 정답 선택과 구분되는 서사 안내입니다. */
  readonly context?: string;
};

/**
 * 빈칸의 음절을 따라 쓰는 문항입니다(Figma 79-6378). 모양과 채점은 쓰기 학습형과 같은 공용
 * 핵심(`lib/writing-session.ts`)의 것이고, 여기서는 문항 종류 낱말만 더합니다.
 */
export type EpisodeFinalWritingQuestion = { readonly kind: "writing" } & WritingQuestion;

export type EpisodeFinalQuestion =
  | EpisodeFinalSpeakingQuestion
  | EpisodeFinalWordChoiceQuestion
  | EpisodeFinalWritingQuestion;

/** 통화 최종 테스트에서 상대가 하는 대사입니다. 잠시 머문 뒤 저절로 다음 차례로 갑니다. */
export type EpisodeFinalCallLine = {
  readonly kind: "line";
  readonly id: string;
  readonly text: string;
  readonly translation: string;
};

/** 통화의 한 차례입니다 — 상대 대사, 또는 내가 답할 말하기 문항입니다. */
export type EpisodeFinalCallTurn = EpisodeFinalCallLine | EpisodeFinalSpeakingQuestion;

/**
 * 최종 테스트입니다. **형식은 그 에피소드의 서사 형식을 따릅니다**(2026-09-28 결정) —
 * 서사가 비주얼 노벨이면 장면 위에서 말하기 · 낱말 고르기를 풀고(Figma 79-6484 · 79-6648),
 * 서사가 통화면 통화를 이어 가며 내 차례마다 말합니다(Figma 79-6043).
 */
export type EpisodeFinalTest =
  | {
      readonly format: "visual-novel";
      readonly unitId: EpisodeFinalUnitId;
      readonly questions: readonly [EpisodeFinalQuestion, ...EpisodeFinalQuestion[]];
      readonly story?: EpisodeFinalStory;
    }
  | {
      readonly format: "call";
      readonly unitId: EpisodeFinalUnitId;
      readonly callerName: string;
      /** 비어 있지 않습니다. 말하기 차례가 적어도 하나 있어야 테스트입니다. */
      readonly turns: readonly [EpisodeFinalCallTurn, ...EpisodeFinalCallTurn[]];
    };

export type EpisodeFinalVisualNovelTest = Extract<EpisodeFinalTest, { format: "visual-novel" }>;
export type EpisodeFinalCallTest = Extract<EpisodeFinalTest, { format: "call" }>;

/** 여정 유닛 목록에 들어가는 모양입니다(`journey-map-units.ts`). */
export type EpisodeFinalJourneyUnitContract = {
  readonly kind: "special";
  readonly id: EpisodeFinalUnitId;
  readonly title: EpisodeFinalTitle;
  readonly screen: "episode-final";
};

/**
 * 맵 항목입니다. 잠김 여부는 항목이 지지 않습니다 — 같은 에피소드의 다른 항목이 모두
 * 끝났는가에서 파생합니다(`episodeFinalStatus`).
 */
export type EpisodeFinalJourneyMapItemContract = {
  readonly kind: "episode-final";
  readonly id: EpisodeFinalUnitId;
  readonly title: EpisodeFinalTitle;
};

/** `JourneyMapItemStatus`의 별칭입니다 — 맵 항목 상태 어휘가 하나로 합쳐졌습니다. */
export type EpisodeFinalStatus = JourneyMapItemStatus;

export type EpisodeFinalMapItemProps = {
  readonly id: EpisodeFinalUnitId;
  readonly title: EpisodeFinalTitle;
  readonly status: EpisodeFinalStatus;
  readonly onSelect: (id: EpisodeFinalUnitId) => void;
};

export type EpisodeFinalScreenProps = {
  /** 가장자리 여백입니다. 그림은 가장자리까지 깔고, 버튼 · 문항만 이 여백 안에 둡니다. */
  readonly insets: SafeAreaInsets;
  /** 머리 제목입니다 — `Episode 0.` */
  readonly episodeLabel: string;
  readonly test: EpisodeFinalVisualNovelTest;
  /**
   * 마지막 문항의 판정 뒤 잠시 뒤에 불립니다. 건너뛴 말하기 문항(인식 불가 · `Can't speak`)은 결과에 싣지 않습니다.
   */
  readonly onFinish: (results: readonly AnswerResult[]) => void;
  /** 뒤로(맵으로)입니다. 푼 것은 버려지고, 다시 들어오면 첫 문항부터입니다. */
  readonly onExit: () => void;
};

export type EpisodeFinalCallScreenProps = Omit<EpisodeFinalScreenProps, "test"> & {
  readonly test: EpisodeFinalCallTest;
  /** 통화 상대의 얼굴입니다. 그림은 화면 폴더끼리 주고받지 못해 결선 자리가 내립니다. */
  readonly callerPortrait: string;
};

export const episodeFinalTestIds = {
  screen: "episode-final-screen",
  back: "episode-final-screen-back",
  call: "episode-final-call-screen",
  callBack: "episode-final-call-screen-back",
  title: "episode-final-screen-title",
  progress: "episode-final-screen-progress",
  speaking: "episode-final-screen-speaking",
  sentence: "episode-final-screen-sentence",
  romanization: "episode-final-screen-romanization",
  waves: "episode-final-screen-waves",
  action: "episode-final-screen-action",
  notNow: "episode-final-screen-not-now",
  wordChoice: "episode-final-screen-word-choice",
  prompt: "episode-final-screen-prompt",
  option: (index: number) => `episode-final-screen-option-${index}`,
  writing: "episode-final-screen-writing",
  writingAction: "episode-final-screen-writing-action",
} as const;
