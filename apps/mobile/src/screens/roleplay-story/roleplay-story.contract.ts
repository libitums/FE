// 에피소드 롤플레이(표지 컷 → 최종 테스트 대사를 말로) 화면들의 계약입니다. 타입만 둡니다.
// 턴 모양은 최종 테스트의 것을 그대로 받습니다 — 같은 콘텐츠(`RP` 스텝)를 같은 계획 함수로 만듭니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { MicPermissionContext } from "../../lib/mic-permission-event.contract";
import type { SpokenAnswerJudgement } from "../../lib/speaking-judge";
import type { SpeechMissReason, SpeechUnavailableReason } from "../../lib/speech-attempt";
import type { SafeAreaInsets } from "../../lib/safe-area";
import type { CatalogRoleplayTurns } from "../catalog-final/catalog-final.contract";

/**
 * 말하기 한 턴의 국면입니다. 판정은 `heard`에서만 섭니다 — 못 알아들었으면 `missed`(곧바로 다시 말하기),
 * 인식을 쓸 수 없으면 `unavailable`.
 */
export type RoleplayTalkPhase = "ready" | "listening" | "heard" | "missed" | "unavailable";

export type RoleplayTalkState = {
  readonly turnIndex: number;
  readonly phase: RoleplayTalkPhase;
  /** 들은 문장입니다. `heard` 밖에서는 빈 글자입니다. */
  readonly heard: string;
  /** 이번 턴의 판정입니다. `heard` 밖에서는 `null`입니다. */
  readonly verdict: AnswerResult | null;
  /** 이번 턴의 발음 판정(등급 · 모범 문장)입니다. `heard` 밖에서는 `null`입니다. */
  readonly judgement: SpokenAnswerJudgement | null;
  /** 힌트 줄(소리 듣기 · 한국어 보기)을 펼쳤는가입니다. 뜻은 패널 맨 위에 늘 섭니다. 턴이 바뀌면 접힙니다. */
  readonly hintShown: boolean;
  /** 이번 턴에 쓴 가장 강한 힌트 — 한국어 보기(`show`)가 소리 듣기(`listen`)보다 앞섭니다. 안 썼으면 `null`. */
  readonly hintUsed: "listen" | "show" | null;
  /** 듣지 못한 까닭 — `unavailable`에서만 값이 있습니다(권한 · 인식기 / 받아쓰기 꺼짐 / 그 한 번의 실패). */
  readonly unavailableReason: SpeechUnavailableReason | null;
  /** 못 알아들은 까닭 — `missed`에서만 값이 있습니다(ADR-0181). */
  readonly missedReason: SpeechMissReason | null;
  /** 못 알아들은 뒤 다시 듣는 중인가 — 그 동안 Try again 자리가 Stop으로 남습니다(포커스를 잃지 않게). */
  readonly retrying: boolean;
  /** 넘긴 턴의 판정입니다. 건너뛴 턴은 싣지 않습니다(인식 불가 · 말할 수 없음을 오답으로 접지 않습니다). */
  readonly results: readonly AnswerResult[];
  readonly skippedCount: number;
};

export type RoleplayTalkAction =
  | { readonly type: "start" }
  | {
      readonly type: "heard";
      readonly text: string;
      readonly verdict: AnswerResult;
      readonly judgement: SpokenAnswerJudgement | null;
    }
  | { readonly type: "missed"; readonly reason: SpeechMissReason }
  | { readonly type: "unavailable"; readonly reason: SpeechUnavailableReason }
  | { readonly type: "hint" }
  | { readonly type: "hintListen" }
  | { readonly type: "hintShow" }
  | { readonly type: "retry" }
  | { readonly type: "next" }
  | { readonly type: "skip" };

/**
 * 시작 전 말하기 준비 — `ready` 곧장 시작 · `ask` 시스템 권한 창을 먼저 · `blocked` 거부(설정으로) ·
 * `unsupported` 이 기기에서 인식기를 쓸 수 없음.
 */
export type SpeechReadiness = "ready" | "ask" | "blocked" | "unsupported";

/** 미리보기에 뜨는 안내 모달 — 거부(설정 열기)와 인식기 없음(그래도 시작). */
export type RoleplaySpeechNotice = "blocked" | "unsupported";
export type RoleplaySpeechNoticeAction = "settings" | "anyway" | "dismiss";

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
  /** 말하기를 쓸 수 없어 뜬 안내. 없으면 `null`. */
  readonly speechNotice: RoleplaySpeechNotice | null;
  readonly onSpeechNoticeAction: (action: RoleplaySpeechNoticeAction) => void;
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
  /** 마이크 권한 안내의 맥락(ADR-0206) — 롤플레이는 레슨 밖이라 열쇠가 없습니다. 없으면 이벤트도 없습니다. */
  readonly mic?: MicPermissionContext;
  /** 턴 하나를 넘기거나 건너뛸 때마다 한 번(측정). 들은 글자는 싣지 않습니다. */
  readonly onTurnAnswered?: (report: RoleplayTurnReport) => void;
};

/** 턴 하나를 넘길 때의 측정입니다(`roleplay-panel.ts`가 만듭니다). */
export type RoleplayTurnReport = {
  /** 1부터. */
  readonly turn: number;
  readonly result: "correct" | "incorrect" | "skipped";
  readonly grade?: "perfect" | "close" | "incorrect";
  readonly hintUsed?: "listen" | "show";
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
    }
  /** 턴 하나를 넘기거나 건너뛴 순간 한 번(ADR-0201 D6 적용 2) — 들은 문장 · 대사는 싣지 않습니다. */
  | {
      readonly name: "roleplay_story_turn_answered";
      readonly episodeId: string;
      /** 몇째 턴인가(1부터, 10진 문자열). */
      readonly turn: string;
      readonly result: "correct" | "incorrect" | "skipped";
      /** 판정이 났을 때만 — perfect · close · incorrect. */
      readonly grade?: "perfect" | "close" | "incorrect";
      /** 쓴 힌트 — 소리 듣기(listen) · 한국어 보기(show). 안 썼으면 없습니다. */
      readonly hintUsed?: "listen" | "show";
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
  /** 아래 패널 맨 위 머리 줄 — 내가 말할 문장(시안 R1). */
  readonly yourLine: string;
  /** 힌트 단계 ② 내 문장 소리 듣기(시안 R5). */
  readonly hearIt: string;
  /** 힌트 단계 ③ 내 문장 한국어 · 로마자 보기(시안 R5). */
  readonly showKorean: string;
  readonly showHint: string;
  readonly hint: (translation: string) => string;
  readonly cantSpeak: string;
  readonly great: string;
  readonly notQuite: string;
  readonly youSaid: (heard: string) => string;
  readonly heardNothing: string;
  readonly unavailable: string;
  readonly blocked: string;
  readonly permissionTitle: string;
  readonly permissionBody: string;
  readonly openSettings: string;
  readonly notNow: string;
  readonly unsupportedTitle: string;
  readonly unsupportedBody: string;
  readonly startAnyway: string;
  readonly retryHeard: string;
  readonly playAgain: string;
};
