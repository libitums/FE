// 내 스토리(ADR-0194 · ADR-0191) 계약입니다 — 단어 · 레슨 카드로 올리는 내 스토리의 앱 쪽 모양 · 포트 · props · test-id. 타입만 둡니다.
// 사진은 없습니다(사진 화면은 다음 단계). 친구(AI 인물)만 보고, 친구에게는 24시간, 내 보관함에는 지울 때까지 남습니다(설정 스위치).
// 서버 모양의 정본은 `@libitums/companion-contract`의 my-stories 스키마입니다 — 앱은 zod를 번들에 넣지 않아 타입만 가져와 이름 · 값을
// 거기서 잇고(`import type`은 빌드에서 지워집니다), 시각은 epoch ms로 풉니다(`my-stories-parse.ts`).

import type {
  MyStory as WireStory,
  MyStoryOverlay as WireOverlay,
  MyStoryWindow as WireWindow,
} from "@libitums/companion-contract";

import type { ChatCrisisResource } from "./chat-source.contract";
import type { FriendStoryWord } from "./friend-stories.contract";

/** 내 스토리의 종류 — 단어장 단어(`word`) · 레슨 카드(`card`). 서버의 `photo`는 이 앱 판이 건너뜁니다(사진 화면 전). */
export type MyStoryKind = Exclude<WireStory["kind"], "photo">;

/**
 * 서버가 받는 스토리 종류(시안 26 ~ 28, **서버 반영 예상**) — `companion_my_stories`의 `kinds`. 없으면 `["word", "card"]`(지금 서버).
 * `text`: 바탕색 + 한국어 한 줄 + 얹은 단어 · 카드, `photo`: 사진(이 앱 판은 버튼만 숨김 — 업로드 화면은 범위 밖).
 */
export type MyStoryPostKind = "word" | "card" | "text" | "photo";

/** 글 스토리의 바탕색(시안 27번 네 가지). 색 값은 화면이 정합니다(`my-story-editor.ts`). */
export type StoryBackground = "orange" | "green" | "blue" | "purple";
/** 글(Aa) 상자의 글자색(시안 29번 네 가지). */
export type StoryTextColor = "brown" | "black" | "white" | "orange";

/** 사진 · 바탕 위에 얹은 단어 · 카드 · 글 하나 — 서버 `myStoryOverlaySchema`와 같은 모양(위치 · 크기는 0 ~ 1 비율, 회전은 도). */
export type MyStoryOverlay = {
  readonly kind: WireOverlay["kind"];
  readonly ko: string;
  readonly roman?: string;
  readonly meaning?: string;
  readonly word?: FriendStoryWord;
  /** 글(Aa) 상자의 글자색 — 서버 반영 예상 칸(계약 overlay에 없음, ADR-0194 적용 기록). */
  readonly color?: StoryTextColor;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotation: number;
};

/** 글 스토리 올리기 요청(시안 27번, 서버 반영 예상 — ADR-0194 적용 기록 「서버에 요청하는 모양」). */
export type MyTextStoryDraft = {
  readonly clientId: string;
  readonly background: StoryBackground;
  /** 한국어 한 줄 — 글 없이 단어만 얹었으면 빈 글. */
  readonly ko: string;
  readonly overlays: readonly MyStoryOverlay[];
  readonly lang: string;
  readonly tzOffsetMin: number;
  /** 기기 지역(ISO 3166-1 alpha-2) — 위기 신호일 때 서버가 그 지역 상담 연락처를 고릅니다(#598 `client_region`). 모르면 없음. */
  readonly region?: string | null;
};

/** 올리기 창의 칸 — 현지 아침 04 ~ 12 · 낮 12 ~ 18 · 밤 18 ~ 04(ADR-0191 D8). */
export type MyStorySlot = WireWindow["slot"];

/** 지금의 올리기 창(ADR-0191 D8) — `used`면 이 창은 썼고 `nextAt`(ms)에 다음 창이 열립니다. `day`는 창이 속한 현지 날(YYYY-MM-DD). */
export type MyStoryWindow = {
  readonly slot: MyStorySlot;
  readonly day: WireWindow["day"];
  readonly nextAt: number;
  readonly used: WireWindow["used"];
};

/** 「Seen by」의 한 줄 — 시각이 된 인물만(ADR-0191 D3). */
export type MyStorySeen = { readonly characterId: string; readonly at: number };

/** 카드의 예문 — 한국어는 그대로, 뜻은 올린 때의 화면 언어입니다. */
export type MyStoryExample = { readonly ko: string; readonly meaning: string };

/** 친구 반응(서버가 LLM으로 만들고 몇 분 ~ 몇 시간에 걸쳐 도착). 한국어 글에는 붙인 단어가 들어 있습니다. */
export type MyStoryReaction = {
  readonly id: string;
  readonly characterId: string;
  /** 그 인물 방의 메시지 id(ADR-0191 D2) — 옛 서버는 null. */
  readonly messageId: string | null;
  readonly text: string;
  /** 올린 사람 화면 언어의 뜻 — 못 만들었으면 null. */
  readonly meaning: string | null;
  readonly at: number;
};

/** 서버 `companion_my_stories()`의 한 줄. 시각은 epoch ms. */
export type MyStory = {
  readonly id: string;
  /** 단어 · 카드, 또는 글 스토리(`text`, 서버 반영 예상). */
  readonly kind: MyStoryKind | "text";
  /** 단어 · 카드 스토리의 단어 — 글 스토리는 null. */
  readonly word: FriendStoryWord | null;
  readonly ko: string;
  readonly roman: string;
  readonly meaning: string;
  readonly example: MyStoryExample | null;
  readonly postedAt: number;
  readonly expiresAt: number;
  readonly reactions: readonly MyStoryReaction[];
  /** 「Seen by」(ADR-0191 D3) — 시각이 된 인물만, 옛 서버 · 스위치 꺼짐은 빈 목록. */
  readonly seenBy: readonly MyStorySeen[];
  /** 글 스토리의 바탕색 — 그 밖은 null. */
  readonly background: StoryBackground | null;
  /** 얹은 단어 · 카드 · 글(글 스토리) — 없으면 빈 목록. */
  readonly overlays: readonly MyStoryOverlay[];
};

/** 내 스토리 읽기 — `enabled`가 거짓이면(서버 스위치 off · 시험 계정 아님) 「+」 동그라미도 서지 않습니다. */
export type MyStoriesState = {
  readonly enabled: boolean;
  /** 24시간 뒤에도 내 보관함에 남기는가(설정 › My stories). */
  readonly keep: boolean;
  readonly stories: readonly MyStory[];
  /** 지금의 올리기 창 — 옛 서버 · 꺼짐은 null(창 판정 없이 「+」). */
  readonly window: MyStoryWindow | null;
  /** 올릴 수 있는 종류(서버 반영 예상) — 칸이 없으면 `["word", "card"]`. */
  readonly kinds: readonly MyStoryPostKind[];
};

/**
 * 올릴 거리 하나 — 단어장 단어. 뜻 · 예문은 화면 언어입니다. 레슨 카드는 앱이 올리지 않습니다(사용자 결정 2026-11-25) — 서버에 있는
 * `card` 스토리는 보기만 그립니다.
 */
export type MyStoryChoice = {
  readonly key: string;
  readonly kind: "word";
  readonly word: FriendStoryWord;
  readonly ko: string;
  readonly roman: string;
  readonly meaning: string;
  readonly example: MyStoryExample | null;
  /** 어디서 왔는가 — 레슨 이름. */
  readonly source: string;
};

export type MyStoryChoices = {
  readonly words: readonly MyStoryChoice[];
};

/** 올리기 요청 — `clientId`가 같으면 서버가 한 번만 올립니다(두 번 눌러도 하나). */
export type MyStoryDraft = {
  readonly clientId: string;
  readonly kind: MyStoryKind;
  readonly word: FriendStoryWord;
  readonly ko: string;
  readonly roman: string;
  readonly meaning: string;
  readonly example: MyStoryExample | null;
  readonly lang: string;
  /** 기기의 UTC 차이(분, 동쪽이 +) — 서버가 시간대를 모를 때 창을 이것으로 셉니다(`p_tz_offset_min`). */
  readonly tzOffsetMin: number;
};

/** 앱이 다루는 올리기 결과 — 서버 `result`중 화면이 가르는 것. 모르는 새 결과 · `invalid`는 failed. */
export type MyStoryPostResult =
  | { readonly result: "ok"; readonly story: MyStory; readonly window: MyStoryWindow | null }
  | { readonly result: "window_used"; readonly window: MyStoryWindow | null }
  /** 글 검수의 위기 신호 — 올리지 않고 기존 위기 안내 카드(ADR-0125)를 띄웁니다. */
  | { readonly result: "crisis"; readonly resources: readonly ChatCrisisResource[] }
  /** `check_limit`: 하루 검수 시도 상한, `invalid`: 서버가 요청 모양을 받지 않음(#598). */
  | {
      readonly result:
        | "off"
        | "daily_limit"
        | "text_blocked"
        | "check_limit"
        | "invalid"
        | "failed";
    };

/** 내 스토리 포트 — 서버 RPC · 고를 거리 · 처음 안내 표시. 어떤 호출도 던지지 않습니다. */
export type MyStoriesPort = {
  /** 못 읽음 · 서버 없음은 null(「+」 없음). 기기의 UTC 차이(분)를 함께 보냅니다. */
  readonly load: () => Promise<MyStoriesState | null>;
  readonly post: (draft: MyStoryDraft) => Promise<MyStoryPostResult>;
  /** 글 스토리 올리기(`kinds`에 text가 있을 때만 부름). */
  readonly postText: (draft: MyTextStoryDraft) => Promise<MyStoryPostResult>;
  /** 하나(id) 또는 모두(null) 지움 — 성공이면 true. */
  readonly remove: (storyId: string | null) => Promise<boolean>;
  /** 보관 스위치 — 바뀐 값, 못 바꾸면 null. */
  readonly setKeep: (keep: boolean) => Promise<boolean | null>;
  /** 단어장 · 레슨 카드(화면 언어). 부를 때마다 지금 것을 읽습니다. */
  readonly choices: () => MyStoryChoices;
  /** 처음 안내를 본 적이 있는가(계정마다 기기 저장). */
  readonly guideSeen: () => boolean;
  readonly markGuideSeen: () => void;
  /** 본 반응 id(계정마다 기기 저장) — 「Your story」 고리 판정. */
  readonly seenReactions: () => ReadonlySet<string>;
  readonly markReactionsSeen: (ids: readonly string[], until: number) => void;
  readonly newClientId: () => string;
  /** 이번 실행에 읽은 서버가 켜져 있었는가 — 설정의 「My stories」 줄. 없으면 false. */
  readonly knownEnabled?: () => boolean;
};

/** 스토리 줄 맨 앞의 내 스토리 칸(ADR-0194) — 「+」(만들기)와, 살아 있는 내 스토리가 있으면 「Your story」. */
export type MineRowSlot = {
  readonly live: MyStory | null;
  /** 살아 있는 내 스토리에 안 본 반응이 있는가 — 주황 고리. */
  readonly unseen: boolean;
  /** 이번 창을 이미 썼으면 다음 창이 열리는 시각(ms) — 「+」 자리가 시계 + 시각(시안 18번)이고 누르면 창 시트. 아니면 null. */
  readonly nextAt: number | null;
  readonly onCreate: () => void;
  readonly onOpen: () => void;
};

/** 창 시트(시안 18번)의 칸 하나 — 지난 칸은 올렸으면 shared · 아니면 missed, 지금 칸은 shared(썼음) · open, 다음 칸은 upcoming. */
export type WindowSlotState = "shared" | "missed" | "open" | "upcoming";
export type WindowSlotView = {
  readonly slot: MyStorySlot;
  readonly state: WindowSlotState;
  /** 칸이 열리는 현지 시(0 ~ 23)와 닫히는 시. */
  readonly startHour: number;
  readonly endHour: number;
};
export type WindowSheetView = {
  /** 지금 칸(썼으면 「You shared this … story」). */
  readonly current: MyStorySlot;
  readonly used: boolean;
  /** 다음 창이 열리는 기기 현지 시각. */
  readonly next: { readonly hours: number; readonly minutes: number };
  readonly slots: readonly WindowSlotView[];
};

/** 친구 얼굴 · 이름(대화방 스냅숏) — 반응 줄에 씁니다. */
export type ReactionFace = { readonly name: string; readonly avatarUrl: string | null };

// test-id 표는 줄 수 상한 때문에 따로 둡니다(같은 이름으로 다시 내보냄).
export { myStoriesTestIds } from "./my-stories-ids";

/**
 * 덕수쌤 스토리 퀴즈(시안 21 ~ 23, 사용자 결정 2026-11-25) — **서버 반영 예상**. 서버 메시지 `meta`의 선택 칸을 앱이 풀어 둔 것입니다
 * (모양은 `companion-parse.ts` `quizMarkOf` · ADR-0194 적용 기록 「서버에 요청하는 모양」). 칸이 없으면 퀴즈 표시는 없습니다.
 * - `ask`: 퀴즈 반응(`meta.quiz.freeAnswer` true — 각도만으론 아님) — 인물 메시지의 첫 말풍선에.
 * - `answer`: 내 답(`meta.quiz { free, attempt, result? }`) — 무료로 받은 답만. `result`는 판정 뒤(없으면 null).
 * 엽전 차감 · 정답 판정은 서버 몫이고 앱은 표시만 합니다.
 */
/** `skipped`: 퀴즈와 상관없는 말이라 서버가 퀴즈를 닫음(#598, ADR-0191 D14) — 답은 무료였고 다음은 무료가 아님. */
export type QuizResult = "correct" | "hint" | "revealed" | "skipped";
export type ChatQuizMark =
  | { readonly kind: "ask" }
  | { readonly kind: "answer"; readonly attempt: 1 | 2; readonly result: QuizResult | null };
