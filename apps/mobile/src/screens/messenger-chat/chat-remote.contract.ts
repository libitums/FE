// 메신저 출처가 컴패니언 서버에 닿는 포트입니다(ADR-0137). 서버 JSON은 순수 해석기(`companion-parse.ts`)가 앱 모양으로 풀고,
// 출처(`chat-fixture-remote.ts`)는 이 포트만 압니다. 어떤 호출도 던지지 않습니다 — 실패는 null · onEnd로 옵니다.

import type { ChatCorrection } from "./chat-feedback.contract";
import type { ChatFriend } from "./chat-friends.contract";
import type { ChatMediaRemote } from "./chat-media.contract";
import type { ChatMessage, ChatReplyIdea } from "./chat-source.contract";

/** 서버 기록 한 쪽을 앱 모양으로 푼 값입니다. 오래된 것부터, 숨김 메시지는 빠져 있습니다. */
export type RemoteHistory = {
  readonly messages: readonly ChatMessage[];
  /** 내 글 id → 서버 교정 카드(고칠 것이 있을 때만). */
  readonly corrections: Readonly<Record<string, ChatCorrection>>;
  /** 마지막 캐릭터 메시지에 저장된 추천 답변 — 없으면 null. */
  readonly ideas: readonly ChatReplyIdea[] | null;
};

/** 첫 인사 — 서버가 인사를 만들지 않았으면(이미 메시지가 있음 · 대화 불가) null. */
export type RemoteGreeting = {
  readonly messages: readonly ChatMessage[];
  readonly ideas: readonly ChatReplyIdea[] | null;
};

/** 턴 스트림의 콜백입니다 — 호스트 SSE 모듈(ADR-0124)의 모양과 같습니다. */
export type RemoteTurnHandlers = {
  readonly onOpen: (status: number) => void;
  readonly onEvent: (event: string, data: string) => void;
  /** 스트림마다 정확히 한 번. `complete`가 아니면 실패 · 취소이고, `http-error`면 `detail`이 응답 본문입니다. */
  readonly onEnd: (reason: string, detail: string | null) => void;
};

export type ChatRemote = {
  readonly loadHistory: (characterId: string) => Promise<RemoteHistory | null>;
  /**
   * 첫 인사. `unlock`이면 해금 선톡입니다 — 서버가 모델로 만들지 않고 그 인물의 정해진 말(해금 장면에 이어지는 말)을 저장합니다.
   * 어느 쪽이든 대화에 메시지가 이미 있으면 서버는 아무것도 만들지 않습니다.
   */
  readonly greet: (characterId: string, trigger?: "unlock") => Promise<RemoteGreeting | null>;
  /** 보낸 글 하나의 턴을 엽니다. `clientMessageId`는 UUID v4(서버 멱등). */
  readonly openTurn: (
    request: {
      readonly characterId: string;
      readonly text: string;
      readonly clientMessageId: string;
    },
    handlers: RemoteTurnHandlers,
  ) => { readonly cancel: () => void };
  /** 사진 · 음성(ADR-0146). 없으면(옛 테스트 원격) 서버 방의 요청은 「unavailable」 줄입니다. */
  readonly media?: ChatMediaRemote;
  /** 학습자 프로필의 생년(ADR-0125 「서버 결선」). 없으면(옛 테스트 원격) 생년은 기기에만 둡니다. */
  readonly profile?: ChatProfileRemote;
  /** 서버 지갑 `companion_get_wallet`(ADR-0155) — 못 읽으면 null. 없으면(옛 테스트 원격) 지갑을 읽지 않습니다. */
  readonly wallet?: () => Promise<RemoteWallet | null>;
  /**
   * 대화 비우기 `companion_clear_chat`(ADR-0156) — 대화 · 그 인물 기억 · 친밀도를 지웁니다. 진행 중인 턴이 있으면 `busy`, 못 지우면
   * null. 없으면(옛 테스트 원격) 서버 방은 비우지 못합니다.
   */
  readonly clearChat?: (characterId: string) => Promise<"cleared" | "busy" | null>;
  /**
   * 추천 친구 `companion_friends` — 이 학습자에게 보이는 친구만(기능이 꺼졌으면 빈 목록, 미성년자는 open 등급 없음). 못 읽으면
   * (RPC 없음 · 404 · 오프라인) null — 앱은 친구를 보이지 않습니다. 없으면(옛 테스트 원격) 추천 줄이 서지 않습니다.
   */
  readonly friends?: () => Promise<readonly ChatFriend[] | null>;
  /** 성인 확인 `companion_ack_adult` — 답의 `adultAck`(못 받으면 null). */
  readonly ackAdult?: () => Promise<boolean | null>;
};

/** 서버 지갑 — 잔액(sub + grant + paid)과 체험 인물의 체험 남은 수(칸이 없거나 틀리면 null). */
export type RemoteWallet = { readonly balance: number; readonly trialRemaining: number | null };

/** 서버 프로필 중 앱이 쓰는 칸 — 생년만. 서버는 생년이 없으면 나이 모름(미성년자와 같은 엄격 규칙)으로 봅니다. */
export type ChatProfileRemote = {
  /**
   * `companion_load_profile` — 프로필 행이 없거나 생년이 비면 `birthYear: null`, 못 읽으면 null. `replySuggestions`는 추천 답변
   * 칩 설정(ADR-0156, 칸이 없으면 null).
   */
  readonly load: () => Promise<{
    readonly birthYear: number | null;
    readonly replySuggestions?: boolean | null;
    /** 추천 친구의 성인 확인(open 등급) — 칸이 없으면 null. */
    readonly adultAck?: boolean | null;
  } | null>;
  /** `companion_save_profile(p_birth_year, p_age_source = "self")` — 성공하면 true. 건너뜀은 서버에 적을 칸이 없습니다. */
  readonly saveBirthYear: (year: number) => Promise<boolean>;
  /** `companion_save_profile(p_reply_suggestions)`(ADR-0156) — 성공하면 true. 꺼진 계정에는 서버가 칩을 만들지 않습니다. */
  readonly saveReplySuggestions?: (on: boolean) => Promise<boolean>;
  /**
   * 학습자 언어(L1, 2026-11-17) — 서버 프로필 `l1`을 읽어 다르거나 비었을 때만 `companion_save_profile(p_l1)`로 씁니다. 맞췄으면
   * true. 맞추는 동안 연 턴 · 사진 요청은 끝난 뒤 나갑니다(첫 답부터 그 언어로).
   */
  readonly syncL1?: (l1: string) => Promise<boolean>;
};

/** 서버가 보내기를 막은 까닭입니다 — 입력 줄 자리 안내(입력 막힘)와 로그 회색 줄(실패) 둘로 나뉩니다. */
export type RemoteSendFailure =
  | { readonly kind: "blocked"; readonly until: number }
  | { readonly kind: "usage-limit"; readonly resetsAt: number }
  | { readonly kind: "age-restricted" }
  | { readonly kind: "no-credits" }
  /** 이 계정 등급으로는 그 인물과 대화할 수 없음(무료는 체험 인물만 — 서버 판정). */
  | { readonly kind: "not-available" }
  /** 서버가 받은 뒤 SSE `error` — 코드는 서버 표(`STREAM_ERRORS`) 그대로. */
  | { readonly kind: "stream-error"; readonly code: string }
  | { readonly kind: "failed" };

/** 서버 보내기 실패 줄(로그 가운데 회색 줄) — 오류 코드마다 무엇이 났고 무엇을 하면 되는지(ADR-0137 · 0138). */
export type ChatSendFailureNotice =
  | "no-credits"
  | "not-available"
  | "send-failed"
  | "reply-failed"
  | "cant-reply"
  | "rate-limited"
  | "update-required"
  | "server-error"
  | "signed-out";
