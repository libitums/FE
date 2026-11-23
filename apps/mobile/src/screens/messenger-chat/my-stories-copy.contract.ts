// 내 스토리 문구표(`UiCopy.messengerChat.myStories`, ADR-0179). 한국어 단어 · 예문은 그대로, 뜻은 데이터가 줍니다.

import type { MyStoryKind } from "./my-stories.contract";

export type MyStoriesCopy = {
  readonly language: string;
  readonly row: {
    readonly create: string;
    readonly createLabel: string;
    readonly mine: string;
    readonly mineLabel: (replies: number, unseen: boolean) => string;
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
    readonly tabsLabel: string;
    readonly tab: (kind: MyStoryKind) => string;
    readonly wordsTitle: string;
    readonly wordCount: (count: number) => string;
    readonly all: string;
    readonly emptyWords: string;
    readonly emptyCards: string;
    /** 탭 · 거르기 칩 — 고른 것은 「, selected」를 붙여 읽습니다(ADR-0016 D3). */
    readonly chipLabel: (label: string, on: boolean) => string;
    readonly choiceLabel: (ko: string, meaning: string, selected: boolean) => string;
    readonly share: (ko: string) => string;
    readonly shareCard: string;
    readonly posting: string;
    readonly dailyLimit: string;
    readonly failed: string;
  };
  readonly viewer: {
    readonly yourStory: string;
    readonly kindLabel: (kind: MyStoryKind) => string;
    readonly cardTag: (kind: MyStoryKind) => string;
    readonly close: string;
    readonly options: string;
    readonly delete: string;
    readonly repliesTitle: string;
    readonly waiting: string;
    readonly hidden: string;
    readonly answer: (name: string) => string;
    readonly reactionLabel: (name: string, text: string, meaning: string | null) => string;
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
    readonly mine: string;
    /** 입력 줄 위 띠 — 아직 보내기 전(감사 minor 4). */
    readonly replyingMine: string;
    readonly deleted: string;
    readonly deletedLabel: string;
  };
};
