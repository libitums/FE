// 내 스토리 문구표(`UiCopy.messengerChat.myStories`, ADR-0194). 한국어 단어 · 예문은 그대로, 뜻은 데이터가 줍니다.

import type {
  MyStoryKind,
  MyStorySlot,
  StoryBackground,
  StoryTextColor,
} from "./my-stories.contract";

export type MyStoriesCopy = {
  readonly language: string;
  readonly row: {
    readonly create: string;
    readonly createLabel: string;
    readonly mine: string;
    readonly mineLabel: (replies: number, unseen: boolean) => string;
    /** 이번 창을 썼을 때 「+」 자리(시안 18번) — 이름 줄 「Next story」, 낭독 「Next story opens at 6 PM」. */
    readonly next: string;
    readonly nextLabel: (time: string) => string;
  };
  readonly guide: {
    readonly title: string;
    readonly body: string;
    readonly steps: readonly { readonly title: string; readonly body: string }[];
    readonly start: string;
    readonly later: string;
    /** 걸음 낭독 — 「1. 제목. 설명」(언어마다 구두점). */
    readonly stepLabel: (n: number, title: string, body: string) => string;
  };
  readonly composer: {
    readonly title: string;
    readonly close: string;
    readonly emptyWords: string;
    readonly choiceLabel: (ko: string, meaning: string, selected: boolean) => string;
    readonly posting: string;
    readonly dailyLimit: string;
    /** 서버가 `window_used`로 막음 — 다음 창 시각(모르면 null). */
    readonly windowUsed: (time: string | null) => string;
    readonly failed: string;
    /** 서버 `check_limit` — 오늘 검수 시도를 다 씀(#598). */
    readonly checkLimit: string;
    /** 서버 `invalid` — 요청을 받지 않음(#598). */
    readonly invalid: string;
  };
  readonly viewer: {
    readonly yourStory: string;
    readonly kindLabel: (kind: MyStoryKind) => string;
    readonly cardTag: (kind: MyStoryKind) => string;
    /** 글 스토리(서버 반영 예상)의 종류 이름 — 「Text story」. */
    readonly textLabel: string;
    readonly close: string;
    readonly options: string;
    readonly delete: string;
    /** 반응 목록 제목(시안 16 · 17번) — 0이면 「No replies yet」. */
    readonly replied: (count: number) => string;
    /** 「Seen by N」 · 낭독 「Seen by N friends」. */
    readonly seenBy: (count: number) => string;
    readonly seenByLabel: (count: number) => string;
    /** 반응마다 그 인물 방으로(ADR-0191 — 「Answer」 인용 띠 대신). */
    readonly openChat: string;
    readonly openChatLabel: (name: string) => string;
    readonly saved: string;
    /** 막 올린 뒤 아직 답이 없음(시안 17번). */
    readonly waiting: string;
    readonly waitingBody: string;
    /** 답할 친구가 없음(시안 17번 아래). */
    readonly noFriendsTitle: string;
    readonly noFriendsBody: string;
    readonly findFriends: string;
    readonly hidden: string;
    readonly reactionLabel: (name: string, text: string, meaning: string | null) => string;
  };
  /** 올리기 창 시트(시안 18번, ADR-0191 D8). */
  readonly window: {
    /** 이번 창을 썼음 — 「You shared this afternoon's story」. */
    readonly title: (slot: MyStorySlot) => string;
    readonly body: (time: string) => string;
    readonly slot: (slot: MyStorySlot) => string;
    readonly range: (start: string, end: string) => string;
    /** 기기 현지 시각 — 정각이면 짧게(「6 PM」). */
    readonly time: (hour: number, minute: number) => string;
    readonly shared: string;
    readonly missed: string;
    readonly open: string;
    readonly opens: (time: string) => string;
    readonly slotLabel: (slot: string, range: string, state: string) => string;
    readonly ok: string;
    readonly close: string;
  };
  /** 「+」 → 시작 고르기(시안 26번). Camera · 최근 사진은 서버가 사진을 받을 때만. */
  readonly start: {
    readonly title: string;
    readonly close: string;
    readonly camera: string;
    readonly background: string;
    readonly recent: string;
  };
  /** 바탕 위에서 만들기(시안 27번). */
  readonly editor: {
    readonly label: string;
    readonly back: string;
    readonly colors: string;
    readonly color: (background: StoryBackground) => string;
    readonly colorLabel: (name: string, on: boolean) => string;
    readonly text: string;
    readonly words: string;
    readonly share: string;
    readonly posting: string;
    /** 지금 서버(단어 · 카드만) — 스티커 하나로 올림. */
    readonly hintOne: string;
    readonly hintMove: string;
    readonly stickerLabel: (ko: string, meaning: string) => string;
    readonly remove: (ko: string) => string;
    readonly textBlocked: string;
  };
  /** Aa — 바탕 위 글 상자에서 바로 쓰기(시안 29 · 30번, 글 서버에서만, 교정 없음). */
  readonly textEntry: {
    /** 입력 칸 낭독 — 「Story text, Korean or English」. */
    readonly label: string;
    readonly help: string;
    readonly done: string;
    readonly colors: string;
    readonly color: (color: StoryTextColor) => string;
    readonly colorLabel: (name: string, on: boolean) => string;
    /** 바탕 위 글 상자 낭독 — 누르면 고쳐 쓰기. */
    readonly editLabel: (ko: string) => string;
  };
  /** 단어 · 카드 넣기 시트(시안 28번). */
  readonly add: {
    readonly title: string;
    readonly hint: string;
    readonly hintOne: string;
  };
  /** 덕수쌤 스토리 퀴즈(시안 21 ~ 23, 서버 반영 예상). */
  readonly quiz: {
    readonly free: string;
    readonly freeAnswer: string;
    readonly lastTry: string;
    readonly correct: (name: string) => string;
  };
  readonly remove: {
    readonly title: string;
    readonly body: (replies: number) => string;
    readonly allTitle: string;
    readonly allBody: string;
    readonly confirm: string;
    readonly cancel: string;
    readonly failed: string;
  };
  readonly archive: {
    readonly entryTitle: string;
    readonly entryDescription: string;
    readonly title: string;
    readonly back: string;
    readonly keep: string;
    readonly keepBody: string;
    readonly count: (count: number) => string;
    readonly newest: string;
    readonly live: string;
    readonly tileMeta: (date: string, replies: number) => string;
    readonly tileLabel: (
      ko: string,
      meaning: string,
      date: string,
      replies: number,
      live: boolean,
    ) => string;
    readonly deleteOne: (date: string) => string;
    /** 오늘 올린 칸의 지우기 — 「Delete story from Today」처럼 깨지지 않게 따로(감사 M4). */
    readonly deleteToday: string;
    readonly deleteAll: string;
    readonly deleteAllNote: string;
    readonly empty: string;
    readonly today: string;
    readonly date: (month: number, day: number) => string;
  };
  readonly quote: {
    /** 내 글 위 — 옛 「Answer」 띠로 보낸 답의 인용(서버 기록에 남아 있음). */
    readonly mine: string;
    /** 인물의 반응 메시지 위(시안 20번, ADR-0191 D2). */
    readonly reacted: string;
    readonly deleted: string;
    readonly deletedLabel: string;
  };
};
