// 카탈로그 최종 테스트 화면의 계약입니다. 타입만 둡니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { NonEmpty } from "../../lib/non-empty";
import type { SafeAreaInsets } from "../../lib/safe-area";

export type CatalogRoleplayTile = { readonly ko: string; readonly roman: string };

/** 최종 테스트의 한 턴입니다 — 상대 대사 하나와 내 대답을 이루는 타일들입니다. */
export type CatalogRoleplayTurn = {
  readonly id: string;
  /** en(prompt.en) */
  readonly instruction: string;
  readonly line: {
    readonly ko: string;
    readonly roman: string | null;
    readonly en: string | null;
  };
  /** 보이는 순서(섞인 뒤)입니다. */
  readonly tiles: NonEmpty<CatalogRoleplayTile>;
  /** ko(answers[].ko), 빈 값 제외 */
  readonly accepted: NonEmpty<string>;
  /** en(answers[0].en) ?? en(stimulus.text.en) */
  readonly replyTranslation: string | null;
  readonly imageUrl: string | null;
  /** 상대 줄(seq n-1)의 전체 주소. 없으면 키가 없습니다. */
  readonly counterpartAudioSource?: string;
  /** 정답 뒤 들려줄 내 줄(seq n)의 전체 주소. 없으면 키가 없습니다. */
  readonly replyAudioSource?: string;
};

export type CatalogRoleplayTurns = NonEmpty<CatalogRoleplayTurn>;

export type CatalogFinalPhase = "arranging" | "checked";

export type CatalogFinalState = {
  readonly turnIndex: number;
  readonly placed: readonly number[];
  readonly phase: CatalogFinalPhase;
  readonly results: readonly AnswerResult[];
};

export type CatalogFinalAction =
  | { readonly type: "toggleTile"; readonly tileIndex: number }
  | { readonly type: "check"; readonly result: AnswerResult }
  | { readonly type: "nextTurn" };

export type CatalogFinalScreenProps = {
  readonly insets: SafeAreaInsets;
  readonly ordinal: number;
  readonly counterpartName: string;
  readonly turns: CatalogRoleplayTurns;
  /** 마지막 턴 뒤 See results — 한 번만 부릅니다. */
  readonly onFinish: (results: readonly AnswerResult[]) => void;
  /** 머리 나가기 · 시스템 뒤로. */
  readonly onExit: () => void;
};

export type CatalogFinalCopy = {
  readonly turnProgress: (ordinal: number, total: number) => string;
  readonly replyLabel: (reply: string) => string;
  readonly replyEmpty: string;
  readonly replyHint: (translation: string) => string;
  readonly correctAnswer: (answer: string) => string;
  /** 정답 상자 위 머리 줄입니다. */
  readonly answerLabel: string;
};

export type CatalogFinalTestId =
  | "catalog-final-screen"
  | "catalog-final-screen-backdrop"
  | "catalog-final-screen-safe"
  | "catalog-final-screen-back"
  | "catalog-final-screen-title"
  | "catalog-final-screen-progress"
  | "catalog-final-screen-line"
  | "catalog-final-screen-instruction"
  | "catalog-final-screen-reply"
  | "catalog-final-screen-hint"
  | "catalog-final-screen-verdict"
  | "catalog-final-screen-answer"
  | "catalog-final-screen-bank"
  | "catalog-final-screen-action";
