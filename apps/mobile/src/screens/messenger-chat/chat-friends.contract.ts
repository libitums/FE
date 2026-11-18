// 추천 친구(스토리 밖 인물 넷)의 계약입니다 — 출처 포트 · 기기 기록 · 프로필 시트 모델 · 문구 · test-id.
// 누가 보이는지는 서버가 정하고(`companion_friends`), 앱은 서버 목록과 인물 표 둘 다에 있는 친구만 보입니다. 추가는 무료 · 무제한이고
// 기기에 계정마다 적습니다(ADR-0117 해금 기록과 같은 꼴). 추가하면 방이 열리고 해금 선톡과 같은 첫 말을 청합니다(ADR-0152).

/** 프로필 시트의 나이 — 이야기 바이블은 「30대」 · 「25~26」처럼 적기도 합니다. */
export type CompanionAge =
  | { readonly kind: "years"; readonly value: number }
  | { readonly kind: "decade"; readonly value: number }
  | { readonly kind: "range"; readonly from: number; readonly to: number };

/** 프로필 번역이 있는 화면 언어 — 문구표의 `friends.profileLanguage`가 고릅니다. */
export type ProfileLanguage = "en" | "es" | "id" | "ja" | "vi";

export type FriendRomanceTier = "open" | "standard";

/** 서버가 이 학습자에게 보이게 한 친구 하나(`companion_friends`). */
export type ChatFriend = { readonly id: string; readonly romanceTier: FriendRomanceTier };

export type ChatFriendsState = {
  /** loading = 서버 목록을 아직 못 받음, ready = 받음, unavailable = 못 받음 · RPC 없음(친구 없음으로). */
  readonly status: "loading" | "ready" | "unavailable";
  /** 서버 목록 ∩ 앱 인물 표 — 인물 표 순서입니다. */
  readonly visible: readonly ChatFriend[];
  /** 이 계정이 이 기기에서 추가한 친구 id(방이 열린 친구) — 서버 목록에서 빠져도 남습니다. */
  readonly added: readonly string[];
  /** 서버 프로필의 성인 확인(`adultAck`) — 아직 모르면 null. */
  readonly adultAck: boolean | null;
};

export type ChatAddFriendResult =
  | { readonly kind: "added"; readonly roomId: string }
  | { readonly kind: "already-added"; readonly roomId: string }
  /** 보이지 않는 친구 · 방이 없음(지운 방) — 아무것도 바꾸지 않습니다. */
  | { readonly kind: "unavailable" };

export type ChatFriendsPort = {
  /** 같은 상태면 같은 참조입니다. 바뀌면 출처 구독자에게 알립니다. */
  readonly state: () => ChatFriendsState;
  readonly add: (characterId: string) => ChatAddFriendResult;
  /** `companion_ack_adult` — 서버가 확인을 적었으면 true. 던지지 않습니다. */
  readonly ackAdult: () => Promise<boolean>;
  /** 서버 목록을 다시 읽습니다(읽는 중이면 무동작). */
  readonly refresh: () => void;
};

/** 기기 기록 한 줄 — 추가한 시각(epoch ms) · 그 친구에게 첫 글을 보냈는지(분석 이벤트 한 번). */
export type FriendRecord = { readonly addedAt: number; readonly messaged: boolean };

export type FriendStore = {
  readonly read: () => ReadonlyMap<string, FriendRecord>;
  /** 이미 있으면 무동작(처음 추가 시각을 지킵니다). */
  readonly add: (characterId: string, at: number) => void;
  readonly markMessaged: (characterId: string) => void;
};

/** 프로필 시트를 연 자리 — 추천 줄 카드 · 목록 줄 아바타 · 방 머리 아바타. */
export type FriendProfileSource = "strip" | "list" | "room";

/** 프로필 시트 모델(순수 `friendProfileModel`이 만듭니다). */
export type FriendProfileModel = {
  readonly id: string;
  readonly name: string;
  readonly avatarPath: string | null;
  readonly age: CompanionAge;
  readonly job: { readonly ko: string; readonly translated: string };
  readonly mbti: string;
  readonly bio: { readonly ko: string; readonly translated: string };
  /** 아직 추가하지 않은 추천 친구만 「친구 추가」 단추가 섭니다. */
  readonly canAdd: boolean;
};

/** 추천 친구 문구(`messengerChat.friends`). */
export type FriendsCopy = {
  /** 프로필 번역에 쓰는 언어 — 표마다 자기 언어(태국어 · 미얀마어 화면은 영어 표, ADR-0158). */
  readonly profileLanguage: ProfileLanguage;
  readonly stripTitle: string;
  readonly cardLabel: (name: string, job: string) => string;
  readonly addFriend: string;
  readonly close: string;
  readonly openProfile: (name: string) => string;
  readonly ageLabel: string;
  readonly jobLabel: string;
  readonly mbtiLabel: string;
  readonly age: (age: CompanionAge) => string;
  /** AI 표시 — 방 고지(`safety.aiDisclosure`)와 같은 말 갈래입니다. */
  readonly aiLabel: string;
  readonly adultTitle: string;
  readonly adultBody: (name: string) => string;
  readonly adultConfirm: string;
  readonly adultCancel: string;
  /** 서버가 더는 보이지 않게 한 친구의 방(대화 불가) — 시트 아래 한 줄. */
  readonly unavailable: (name: string) => string;
};

export const friendsTestIds = {
  strip: "messenger-friends-strip",
  stripTitle: "messenger-friends-strip-title",
  card: (id: string) => `messenger-friends-card-${id}`,
  sheet: "friend-profile-sheet",
  sheetName: "friend-profile-name",
  sheetAge: "friend-profile-age",
  sheetJob: "friend-profile-job",
  sheetMbti: "friend-profile-mbti",
  sheetBio: "friend-profile-bio",
  sheetBioTranslated: "friend-profile-bio-translated",
  sheetAi: "friend-profile-ai",
  sheetUnavailable: "friend-profile-unavailable",
  rowAvatar: (roomId: string) => `messenger-list-row-avatar-${roomId}`,
  roomAvatar: "messenger-chat-header-avatar",
  adultDialog: "friend-adult-dialog",
} as const;
