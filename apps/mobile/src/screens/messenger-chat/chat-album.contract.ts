// 사진 · 음성 앨범 · 사진 속 내 모습 · 다시 그리기의 계약입니다(ADR-0150 — 미디어 2단계, ADR-0146 D5 ~ D7).
//
// 앨범은 대화와 따로 삽니다 — 서버 방은 `companion_list_media`(다 만든 것만, 최신부터), 가짜 출처는 방 로그의 사진 · 음성 줄입니다.
// 다시 만들기(`again`)는 그 메시지가 서버에 남아 있을 때만 됩니다(지난 대화는 서버가 거절 — 버튼을 숨깁니다).

import type { ChatMediaNotice } from "./chat-media.contract";
import type { ChatMediaKind, ChatText } from "./chat-source.contract";

/** 사진에 그릴 학습자 뒷모습(서버 `snapshot_self`). 얼굴은 늘 그리지 않습니다. */
export type ChatSnapshotSelf = "female" | "male" | "hidden";
/** 고른 적 없으면 서버 기본값입니다. */
export const DEFAULT_SNAPSHOT_SELF: ChatSnapshotSelf = "female";
/** 고르는 순서(시트 · 첫 질문). */
export const SNAPSHOT_SELVES: readonly ChatSnapshotSelf[] = ["female", "male", "hidden"];

export type ChatAlbumTab = "all" | "photos" | "voice";

/** 앨범 한 칸입니다. `createdAt`은 ms, `url`은 서명 URL(못 받으면 null — 빈 칸 · 재생 꺼짐). */
export type ChatAlbumItem = {
  readonly id: string;
  /** 그때의 캐릭터 메시지 — 같은 메시지의 사진이 둘 이상이면 판(version)입니다. */
  readonly messageId: string;
  readonly kind: ChatMediaKind;
  readonly url: string | null;
  readonly aspect: "3:2" | "1:1" | null;
  /** 그때의 말(ko · en). 모르면 빈 줄입니다. */
  readonly line: ChatText;
  readonly createdAt: number;
  /** 그 메시지가 지금 대화에 없음(대화를 지움) — 「From a past chat」, 다시 만들 수 없습니다. */
  readonly fromPastChat: boolean;
};

export type ChatAlbumPage = { readonly items: readonly ChatAlbumItem[]; readonly hasMore: boolean };

/** 다시 만들기 요청 한 번의 결과입니다. started = 받았음(만드는 중 · 방에 자리표시자). */
export type ChatRemakeResult =
  | { readonly kind: "started" }
  | { readonly kind: "refused"; readonly notice: ChatMediaNotice }
  | { readonly kind: "failed" };

/** 출처의 앨범 포트입니다. 어떤 호출도 던지지 않습니다. */
export type ChatAlbumPort = {
  /** 그 방 인물의 한 쪽(최신부터, `before` ms 커서). 못 읽으면 null. */
  readonly load: (roomId: string, before: number | null) => Promise<ChatAlbumPage | null>;
  /** `again: true` 요청 — 방 로그에 자리표시자를 세우고 결과가 오면 옛 결과 자리를 대신합니다(M7). */
  readonly remake: (roomId: string, item: ChatAlbumItem) => Promise<ChatRemakeResult>;
};

/** 앨범 날짜 묶음의 머리입니다 — 문구는 앱이 풉니다. */
export type ChatAlbumDay =
  | { readonly kind: "today" }
  | { readonly kind: "yesterday" }
  | { readonly kind: "date"; readonly month: number; readonly day: number };

/** 격자 한 칸 — 같은 메시지 사진의 판들은 최신 하나가 칸이 되고 나머지는 `versions`(오래된 것부터, 칸 포함)에 섭니다. */
export type ChatAlbumTile = {
  readonly item: ChatAlbumItem;
  readonly versions: readonly ChatAlbumItem[];
  /** 지금 다시 만드는 중(앨범 화면이 요청한 것) — 「Drawing…」. */
  readonly remaking: boolean;
};

export type ChatAlbumSection = {
  readonly day: ChatAlbumDay;
  readonly tiles: readonly ChatAlbumTile[];
};

export type ChatAlbumCopy = {
  readonly sidebarRow: string;
  readonly sidebarDescription: string;
  readonly title: (name: string) => string;
  readonly back: string;
  readonly tabs: Readonly<Record<ChatAlbumTab, string>>;
  readonly day: (day: ChatAlbumDay) => string;
  readonly drawing: string;
  readonly recording: string;
  readonly versions: (count: number) => string;
  readonly version: (index: number, count: number) => string;
  readonly pastChat: string;
  readonly keepNote: string;
  readonly empty: (name: string) => string;
  readonly loadFailed: string;
  readonly tryAgain: string;
  readonly more: string;
  readonly photoLabel: (name: string, line: string) => string;
  readonly voiceLabel: (name: string, line: string) => string;
  readonly viewerTitle: (name: string, day: string) => string;
  readonly fromChat: string;
  readonly close: string;
  readonly redraw: (price: number) => string;
  readonly recordAgain: (price: number) => string;
  readonly play: string;
  readonly pause: string;
  readonly redrawTitle: string;
  readonly redrawBody: (name: string) => string;
  readonly recordTitle: string;
  readonly recordBody: (name: string) => string;
  readonly confirmRedraw: (price: number) => string;
  readonly confirmRecord: (price: number) => string;
  readonly balance: (coins: number) => string;
  readonly getCoins: string;
  readonly cancel: string;
  readonly refused: (notice: ChatMediaNotice, media: ChatMediaKind, name: string) => string;
  readonly selfSection: string;
  readonly selfRow: string;
  readonly selfTitle: string;
  readonly selfBody: string;
  readonly selfAsk: string;
  readonly selfAskNote: string;
  readonly selfOptions: Readonly<
    Record<ChatSnapshotSelf, { readonly title: string; readonly body: string }>
  >;
  readonly save: string;
};

export const chatAlbumTestIds = {
  sidebarRow: "messenger-chat-sidebar-album",
  screen: "chat-album-screen",
  back: "chat-album-back",
  tab: (tab: ChatAlbumTab) => `chat-album-tab-${tab}`,
  tile: (id: string) => `chat-album-tile-${id}`,
  empty: "chat-album-empty",
  failed: "chat-album-failed",
  retry: "chat-album-retry",
  more: "chat-album-more",
  viewer: "chat-album-viewer",
  viewerClose: "chat-album-viewer-close",
  viewerVersion: (index: number) => `chat-album-viewer-version-${index}`,
  redraw: "chat-album-redraw",
  voiceSheet: "chat-album-voice-sheet",
  voicePlay: "chat-album-voice-play",
  /** 음성 시트의 Record again도 ui-lynx `BottomSheet` action id로 붙습니다. */
  recordAgain: "ui-lynx-bottom-sheet-action-record-again",
  confirm: "chat-album-remake-dialog",
  confirmGo: "chat-album-remake-go",
  confirmCancel: "chat-album-remake-cancel",
  refused: "chat-album-refused",
  selfRow: "chat-settings-snapshot-self",
  selfSheet: "chat-settings-snapshot-self-sheet",
  selfOption: (self: ChatSnapshotSelf) => `chat-snapshot-self-${self}`,
  /** 시트의 Save는 ui-lynx `BottomSheet`가 action id로 test-id를 붙입니다. */
  selfSave: "ui-lynx-bottom-sheet-action-save",
  selfAsk: "messenger-chat-ask-self",
} as const;
