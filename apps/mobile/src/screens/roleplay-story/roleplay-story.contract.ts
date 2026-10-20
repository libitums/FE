// 에피소드 롤플레이(표지 컷 → 최종 테스트 대사를 말로) 화면들의 계약입니다. 타입만 둡니다.
// 턴 모양은 최종 테스트의 것을 그대로 받습니다 — 같은 콘텐츠(`RP` 스텝)를 같은 계획 함수로 만듭니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { SafeAreaInsets } from "../../lib/safe-area";
import type { CatalogRoleplayTurns } from "../catalog-final/catalog-final.contract";

/** 말하기 한 턴의 국면입니다. 판정은 `heard`에서만 섭니다 — 인식을 쓸 수 없으면 `unavailable`. */
export type RoleplayTalkPhase = "ready" | "listening" | "heard" | "unavailable";

export type RoleplayTalkState = {
  readonly turnIndex: number;
  readonly phase: RoleplayTalkPhase;
  /** 들은 문장입니다. `heard` 밖에서는 빈 글자입니다. */
  readonly heard: string;
  /** 이번 턴의 판정입니다. `heard` 밖에서는 `null`입니다. */
  readonly verdict: AnswerResult | null;
  /** 힌트(내가 할 말의 뜻)를 펼쳤는가입니다. 턴이 바뀌면 접힙니다. */
  readonly hintShown: boolean;
  /** 넘긴 턴의 판정입니다. 건너뛴 턴은 싣지 않습니다(인식 불가 · 말할 수 없음을 오답으로 접지 않습니다). */
  readonly results: readonly AnswerResult[];
  readonly skippedCount: number;
};

export type RoleplayTalkAction =
  | { readonly type: "start" }
  | { readonly type: "heard"; readonly text: string; readonly verdict: AnswerResult }
  | { readonly type: "unavailable" }
  | { readonly type: "hint" }
  | { readonly type: "retry" }
  | { readonly type: "next" }
  | { readonly type: "skip" };

export type RoleplayPreviewScreenProps = {
  readonly insets: SafeAreaInsets;
  /** 「Episode n.」 */
  readonly ordinal: number;
  /** 에피소드 제목(영어 제목이 있으면 그것) */
  readonly title: string;
  readonly counterpartName: string;
  readonly lineCount: number;
  /** 장면 그림 — 표지 마지막 컷. 없으면 단색 바탕입니다. */
  readonly imageUrl: string | null;
  readonly onStart: () => void;
  readonly onExit: () => void;
};

export type RoleplayTalkScreenProps = {
  readonly insets: SafeAreaInsets;
  readonly ordinal: number;
  readonly counterpartName: string;
  readonly turns: CatalogRoleplayTurns;
  /** 판정에서 빼는 낱말 — 채워 넣은 이름 · 나라. 외국 이름은 한국어 인식기가 받아 적지 못합니다. */
  readonly wildcards: readonly string[];
  /** 마지막 턴 뒤 — 한 번만 부릅니다. */
  readonly onFinish: (results: readonly AnswerResult[], skippedCount: number) => void;
  readonly onExit: () => void;
};

/** 에피소드 롤플레이의 분석 이벤트입니다 — 열림과 끝까지 마침. 대사 · 들은 문장은 싣지 않습니다(ADR-0029 D14). */
export type RoleplayStoryEvent =
  | { readonly name: "roleplay_story_opened"; readonly episodeId: string }
  | {
      readonly name: "roleplay_story_completed";
      readonly episodeId: string;
      /** 수는 문자열입니다 — 분석 속성은 문자열 · 불리언만 받습니다(`fetchedCount`와 같은 규약). */
      readonly correctCount: string;
      readonly judgedCount: string;
      readonly skippedCount: string;
    };

export type RoleplayStoryCopy = {
  readonly lineCount: (count: number) => string;
  readonly withCounterpart: (name: string) => string;
  readonly previewBody: (name: string) => string;
  readonly start: string;
  readonly lineProgress: (ordinal: number, total: number) => string;
  readonly me: string;
  readonly speak: string;
  readonly stop: string;
  readonly listening: string;
  readonly showHint: string;
  readonly hint: (translation: string) => string;
  readonly cantSpeak: string;
  readonly great: string;
  readonly notQuite: string;
  readonly youSaid: (heard: string) => string;
  readonly heardNothing: string;
  readonly unavailable: string;
  readonly playAgain: string;
};
