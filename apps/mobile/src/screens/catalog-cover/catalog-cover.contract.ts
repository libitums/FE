// 카탈로그 표지 컷 화면의 계약입니다. 타입만 둡니다.

import type { FillScript } from "../../lib/placeholder-fill";
import type { SafeAreaInsets } from "../../lib/safe-area";

export type CatalogCutScript = "en" | "roman";

export type CatalogCutSpeaker =
  | { readonly kind: "self" }
  | { readonly kind: "named"; readonly name: string };

export type CatalogCutText = {
  readonly ko: string;
  readonly en: string | null;
  readonly roman: string | null;
};

export type CatalogCutView =
  | {
      readonly kind: "line";
      /** 독백(`monologue`)은 `thought` — 주황 테두리 패널, 대사는 괄호 안. */
      readonly voice: "speech" | "thought";
      readonly index: number;
      readonly speaker: CatalogCutSpeaker;
      readonly text: CatalogCutText;
      readonly aside: CatalogCutText | null;
      readonly imageUrl: string | null;
    }
  | {
      readonly kind: "narration";
      readonly index: number;
      readonly text: CatalogCutText;
      readonly imageUrl: string | null;
    };

export type CatalogCuts = readonly [CatalogCutView, ...CatalogCutView[]];

export type CatalogCutPort = {
  readonly imageUrlOf: (relativePath: string) => string | null;
  /** 프로필을 묶은 치환입니다. */
  readonly fill: (text: string, script: FillScript) => string;
};

/** 같은 컷 화면이 서는 자리 — 에피소드 앞(표지)과 최종 테스트 통과 뒤. */
export type CatalogCutStage = "prologue" | "epilogue";

export type CatalogCoverScreenProps = {
  readonly insets: SafeAreaInsets;
  readonly stage: CatalogCutStage;
  /** 제목은 화면이 `copy.catalogMap.episodeLabel(ordinal)`로 만듭니다. */
  readonly ordinal: number;
  readonly cuts: CatalogCuts;
  /** 마지막 컷의 버튼 — 화면이 한 번만 부릅니다. */
  readonly onComplete: () => void;
  /** 머리 나가기 · 시스템 뒤로. */
  readonly onExit: () => void;
};

export type CatalogCoverCopy = {
  /** 지금 보이는 것이 key일 때 누르면 일어날 일 */
  readonly toggleScript: Readonly<Record<CatalogCutScript, string>>;
  /** 진행 버튼 낭독(마지막 전) */
  readonly nextCut: (ordinal: number, total: number) => string;
  /** 진행 버튼 낭독(마지막) */
  readonly finishCover: string;
  /** 진행 버튼 낭독(통과 뒤 컷의 마지막) */
  readonly finishEpilogue: string;
  /** 독백 낭독에서 화자 뒤에 붙는 말 — 괄호를 기호로 읽지 않게. */
  readonly thinking: string;
};

export type CatalogCoverTestId =
  | "catalog-cover-screen"
  | "catalog-cover-screen-backdrop"
  | "catalog-cover-screen-safe"
  | "catalog-cover-screen-back"
  | "catalog-cover-screen-title"
  | "catalog-cover-screen-line"
  | "catalog-cover-screen-aside"
  | "catalog-cover-screen-next";
