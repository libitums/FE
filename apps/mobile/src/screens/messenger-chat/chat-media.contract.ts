// 서버 모드 사진(Snapshot) · 음성(Snap voice)의 앱 계약입니다(ADR-0146 「앱 연결」). 서버 모양의 정본은 계약 패키지 `media.ts`이고,
// 앱은 zod를 번들에 넣지 않아(번들 상한) 같은 모양을 손으로 봅니다(`companion-media-parse.ts`).

import type { ChatSnapshotSelf } from "./chat-album.contract";
import type { ChatMediaKind, ChatText } from "./chat-source.contract";

/** 회색 안내 줄의 까닭입니다 — 결과(blocked · failed)와 요청 거절 · 실패. */
export type ChatMediaNotice =
  | "blocked"
  | "failed"
  | "request-failed"
  | "limit"
  | "busy"
  | "no-coins"
  | "not-eligible"
  | "unavailable"
  /** 예시 스냅샷을 받은 뒤 서는 한 줄 — 「이번 것은 무료, 다음부터는 엽전」(ADR-0146 추가). */
  | "sample-gift";

/** 로그 줄 하나(사진 · 음성 결과 대신 서는 회색 줄). `until`은 상한이 풀리는 시각(ms) — limit만. */
export type ChatMediaNoticeLine = {
  readonly kind: "media-notice";
  readonly media: ChatMediaKind;
  readonly notice: ChatMediaNotice;
  readonly until: number | null;
};

/** 사진 줄의 본문 — 가짜 출처는 `imageUrl`만, 서버 사진은 비율 · AI 표시가 더 붙습니다. */
export type ChatPhotoBody = {
  readonly imageUrl: string | null;
  readonly aspect?: "3:2" | "1:1";
  readonly aiGenerated?: boolean;
};

export type RemoteMediaKind = "snapshot" | "voice";
export type RemoteMediaStatus = "pending" | "complete" | "blocked" | "failed";

/** 서버 결과 한 건(`companion.media_json`)에서 앱이 쓰는 칸입니다. `createdAt`은 ms. */
export type RemoteMedia = {
  readonly id: string;
  readonly messageId: string;
  readonly kind: RemoteMediaKind;
  readonly status: RemoteMediaStatus;
  readonly path: string | null;
  readonly aspect: "3:2" | "1:1" | null;
  readonly failure: string | null;
  readonly createdAt: number;
  /**
   * 만드는 중인 사진의 진행 단계(ADR-0146 개정 2026-11-23) — 장면 구상 `preparing` → 그리기 `drawing`. 끝났거나 옛 서버면 null · 없음.
   * `drawing`부터는 `aspect`도 적혀 있습니다.
   */
  readonly stage?: "preparing" | "drawing" | null;
};

/**
 * 대기 줄이 싣는 서버 진행 단계 · 비율(ADR-0146 개정 2026-11-23) — 없으면(옛 서버 · 가짜 방) 기다린 시간으로만 추정합니다.
 * 단계는 문구를 앞으로만 당깁니다(「그리는 중」이면 적어도 둘째 문구). `aspect`는 도착할 사진의 비율입니다.
 */
export type ChatPendingStage = {
  readonly serverStage?: NonNullable<RemoteMedia["stage"]>;
  readonly aspect?: NonNullable<RemoteMedia["aspect"]>;
};

/** 앨범 RPC(`companion_list_media`)의 한 건 — 그때의 말 · 지난 대화 표시가 더 붙습니다(ADR-0150). */
export type RemoteAlbumMedia = RemoteMedia & {
  readonly characterId: string;
  readonly line: ChatText;
  readonly fromPastChat: boolean;
};

/** 요청 한 번의 결과입니다. failed = 연결 실패 · 5xx · 본문 깨짐(서버가 받았는지 모름). */
export type MediaRequestResult =
  | { readonly kind: "accepted"; readonly media: RemoteMedia; readonly cached: boolean }
  | { readonly kind: "refused"; readonly notice: ChatMediaNotice; readonly until: number | null }
  | { readonly kind: "failed" };

/** 출처가 서버 사진 · 음성에 닿는 포트입니다. 어떤 호출도 던지지 않습니다. */
export type ChatMediaRemote = {
  /** `again` = 저장본을 두고 새로 만들기(ADR-0150 — 사진 25 · 35, 음성 15). */
  readonly request: (
    kind: RemoteMediaKind,
    messageId: string,
    again?: boolean,
  ) => Promise<MediaRequestResult>;
  /** `companion_get_media` — 못 읽으면 null. */
  readonly load: (query: {
    readonly ids?: readonly string[];
    readonly messageIds?: readonly string[];
  }) => Promise<readonly RemoteMedia[] | null>;
  /** 비공개 버킷 파일의 서명 URL — 못 받으면 null. */
  readonly sign: (path: string) => Promise<string | null>;
  /** `companion_list_media` — 그 인물의 다 만든 것(최신부터). 없으면(옛 테스트 원격) 앨범은 빈 쪽입니다. */
  readonly list?: (query: {
    readonly characterId: string;
    readonly before: number | null;
    readonly limit: number;
  }) => Promise<{ readonly items: readonly RemoteAlbumMedia[]; readonly hasMore: boolean } | null>;
  /** `companion_save_profile(p_snapshot_self)` — 성공하면 true. */
  readonly saveSelf?: (self: ChatSnapshotSelf) => Promise<boolean>;
  /** 서버 지갑 잔액(sub + grant + paid) — 못 읽으면 null. */
  readonly balance: () => Promise<number | null>;
  /**
   * 예시 스냅샷(ADR-0146 추가) — 안내에서 무료로 한 장. `offer`는 그 인물의 예시를 이 계정에 줄 수 있는가(못 읽으면 false),
   * `claim`은 그 메시지에 예시를 받기(값 없음 · 엔진 없음, 계정당 한 번). 없으면(옛 원격) 안내의 예시 단계가 서지 않습니다.
   */
  readonly sample?: {
    readonly offer: (characterId: string) => Promise<boolean>;
    readonly claim: (messageId: string) => Promise<MediaRequestResult>;
  };
};

export type ChatMediaOutcome = "complete" | "blocked" | "failed" | "refused";
export type ChatMediaSettled = {
  readonly characterId: string;
  readonly media: ChatMediaKind;
  readonly outcome: ChatMediaOutcome;
};

/** 출처 밖으로 내보내는 알림입니다(앱 결선이 머리 엽전 칩 · 제품 이벤트로 잇습니다). */
export type ChatMediaHooks = {
  /** 서버 지갑 잔액 — 사진 · 음성 예약 · 결과 뒤, 대화 턴의 `done` 뒤, 서버 출처를 만들 때(ADR-0155). */
  readonly onBalance?: (balance: number) => void;
  /** 체험 인물의 체험 남은 수(ADR-0155) — 서버 출처를 만들 때 · 체험 인물의 턴 뒤 지갑을 다시 읽어 알립니다. */
  readonly onTrialRemaining?: (remaining: number) => void;
  readonly onSettled?: (settled: ChatMediaSettled) => void;
};

/** 알약의 상태 — ready만 누를 수 있습니다. */
export type ChatMediaAvailability = "ready" | "wait" | "pending" | "done";

/** 대상 메시지 — 가장 최근 캐릭터 메시지(서버 id)와 그 말(음성 말풍선에 그대로). */
export type ChatMediaTarget = { readonly messageId: string; readonly text: ChatText };

/** 문구(`messengerChat.media`, 5개 언어). `until`은 기기 시각 "h:mm"으로 풀어 넘깁니다. */
export type ChatMediaCopy = {
  readonly notice: (
    notice: ChatMediaNotice,
    media: ChatMediaKind,
    name: string,
    until: string | null,
  ) => string;
  readonly hint: (
    availability: ChatMediaAvailability,
    media: ChatMediaKind,
    name: string,
  ) => string;
  readonly aiLabel: string;
  readonly voiceLabel: (name: string, ko: string, en: string) => string;
  readonly listVoice: string;
};

export const chatMediaTestIds = {
  notice: "messenger-chat-media-notice",
  ai: "messenger-chat-media-ai",
} as const;
