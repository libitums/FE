// 체험판이 그리는 것 — 빌드 때 u00 사본을 디코드해 만든 값입니다. 페이지에 JSON으로 실립니다.
import type { Episode } from "@libitums/episode-core/episode";
import type { NonEmpty } from "@libitums/episode-core/judge";

/** 화면에 싣는 한 줄 — 빈 로마자 · 영어는 null. */
export type TrialText = {
  readonly ko: string;
  readonly roman: string | null;
  readonly en: string | null;
};

/** 컷 화자 — 「나」(와이어 `플레이어`) · 이름 · 없음(내레이션). */
export type TrialSpeaker =
  | { readonly kind: "self" }
  | { readonly kind: "named"; readonly name: string };

export type TrialCut = {
  readonly index: number;
  /** narration: 화자 없음 · speech: 말 · thought: 독백(괄호로 감싸지 않은 원문, 괄호는 화면이 그린다). */
  readonly voice: "narration" | "speech" | "thought";
  readonly speaker: TrialSpeaker | null;
  readonly text: TrialText;
  /** speech 컷의 지문(`aside`) — 없으면 null. */
  readonly aside: TrialText | null;
  readonly imageUrl: string | null;
  readonly audioUrl: string | null;
};

export type TrialVocab = {
  readonly itemId: string;
  readonly word: TrialText;
  readonly example: TrialText | null;
  readonly audioUrl: string | null;
  readonly exampleAudioUrl: string | null;
};

export type TrialOption = {
  readonly ko: string;
  readonly roman: string | null;
  readonly en: string | null;
};

type TrialChoiceBase = {
  readonly itemId: string;
  /** prompt.en */
  readonly instruction: string;
  readonly options: NonEmpty<TrialOption>;
  /** 콘텐츠 순서 그대로(섞지 않음 — 앱과 같다). */
  readonly answerIndex: number;
  readonly audioUrl: string | null;
};
/** IMG_MATCH — 제시문 = 정답 보기의 영어 뜻. */
export type TrialImageMatch = TrialChoiceBase & {
  readonly prompt: string;
  readonly imageUrl: string;
};
/** REPLY_SELECT — 상대 말(stimulus.audio)을 글로도 보인다. */
export type TrialReplySelect = TrialChoiceBase & { readonly line: TrialText };

export type TrialCulture = {
  readonly itemId: string;
  readonly title: TrialText;
  readonly body: TrialText;
  readonly tip: TrialText;
  readonly imageUrl: string | null;
};

export type TrialTile = { readonly ko: string; readonly roman: string | null };

export type TrialTurn = {
  readonly itemId: string;
  /** 상대 줄 = item.context */
  readonly line: TrialText;
  /** 보이는 순서(shuffledOrder(`${episodeId}/${itemId}`)로 섞인 뒤). */
  readonly tiles: NonEmpty<TrialTile>;
  /** answers[].ko, 빈 값 제외. */
  readonly accepted: NonEmpty<string>;
  /** 힌트 · 정답 뒤 번역 — answers[0].en ?? stimulus.text.en. */
  readonly replyTranslation: string | null;
  /** 힌트의 로마자 — answers[0].roman. */
  readonly replyRoman: string | null;
  /** roleplayLinesOf(lineId, dialogue)의 상대 줄 음성. */
  readonly counterpartAudioUrl: string | null;
  /** 같은 함수의 내 줄 음성 — 정답 뒤에 낸다. */
  readonly replyAudioUrl: string | null;
};

export type TrialModel = {
  readonly episodeId: string;
  /** 사본의 판 — `TRIAL_CONTENT.version`. */
  readonly version: string;
  readonly counterpartName: string;
  readonly prologue: NonEmpty<TrialCut>;
  readonly vocab: TrialVocab;
  readonly imageMatch: TrialImageMatch;
  readonly replySelect: TrialReplySelect;
  readonly culture: TrialCulture;
  readonly roleplay: { readonly imageUrl: string | null; readonly turns: NonEmpty<TrialTurn> };
  readonly epilogue: NonEmpty<TrialCut>;
};

/** 빌드 때 주소를 정하는 입력입니다. */
export type TrialAssetPort = {
  /** 콘텐츠 그림 경로(`content/images/…` 또는 `images/…`) → 랜딩 사본의 빌드 주소. 표에 없으면 null. */
  readonly imageUrlOf: (contentPath: string) => string | null;
  /** 버킷 기준 주소(`contentBaseUrl(PUBLIC_SUPABASE_URL)`) — 없으면 "" → 음성 전부 null. */
  readonly contentBase: string;
};

/** 어느 단계 · 문항을 쓰는지 — 고정값. */
export type TrialPick = {
  readonly vocab: "S1";
  readonly imageMatch: "S3";
  readonly replySelect: "S9";
  readonly culture: "S12";
  /** post_cuts 전부(u00 4) — 3 · 4의 「누구였을까?」가 예고로 이어진다. */
  readonly epilogueCuts: 4;
};

export type TrialModelError = {
  readonly code: "decode-failed" | "step-missing" | "item-malformed";
  readonly path: string;
};

/** 순수 — 고른 단계가 없거나 모양이 어긋나면 오류 목록(빌드가 던진다). */
export type TrialModelOf = (
  episode: Episode,
  port: TrialAssetPort,
) =>
  | { readonly ok: true; readonly model: TrialModel }
  | { readonly ok: false; readonly errors: readonly TrialModelError[] };

/** 빌드 때 한 번 — 사본을 decodeEpisode → trialModelOf. 실패면 던진다. */
export type LoadTrialModel = (port: TrialAssetPort) => TrialModel;

/** 사본 고정값. */
export type TrialContentPin = {
  readonly episodeId: "u00-tutorial";
  readonly version: string;
  readonly bytes: number;
  readonly sha256: string;
};

/** `PUBLIC_SUPABASE_URL` 원문 → 버킷 기준 주소 또는 "". 모양이 틀리면 · 프로덕션에서 비면 던진다. */
export type ResolveTrialContentBase = (env: string | undefined, production: boolean) => string;
