// 더보기 메뉴 · Letters · 합치기 퀴즈 · My words · Letters 추천 문구의 모양(ADR-0168)입니다. 타입만 둡니다 — 값은
// `ui-copy-more.ts`(영어 · 스페인어 · 인도네시아어) · `ui-copy-more-asia.ts`(일본어 · 베트남어)가 집니다.

export type MoreCopy = {
  readonly menu: {
    /** 바 넷째 단추의 이름 · 열린 동안의 이름. */
    readonly tab: string;
    readonly close: string;
    readonly letters: string;
    readonly lettersDescription: string;
    readonly wordbook: string;
    readonly wordbookDescription: (words: number, due: number) => string;
    readonly settings: string;
    readonly settingsDescription: string;
    /** 메뉴가 열릴 때 한 번 낭독 — 「Menu, 3 items」. */
    readonly opened: string;
  };
  readonly letters: {
    readonly title: string;
    readonly lead: string;
    readonly practice: string;
    readonly groups: Readonly<Record<"consonants" | "vowels" | "doubles" | "combined", string>>;
    /** 소리가 아직 없는 칸의 낭독 꼬리. */
    readonly soundUnavailable: string;
    /** 들은 칸의 낭독 꼬리. */
    readonly heard: string;
  };
  readonly compose: {
    readonly formLabel: string;
    readonly instruction: string;
    readonly play: string;
    readonly make: (roman: string) => string;
    readonly hint: string;
    readonly hintText: (roman: string) => string;
    readonly consonantSlot: string;
    readonly vowelSlot: string;
    readonly resultSlot: string;
    readonly emptySlot: string;
    readonly tryAgain: string;
    readonly done: string;
    readonly complete: string;
  };
  readonly wordbook: {
    readonly title: string;
    readonly review: (count: number) => string;
    readonly reviewTime: string;
    readonly nothingToReview: string;
    readonly filters: Readonly<Record<"all" | "new" | "review" | "known", string>>;
    readonly status: Readonly<Record<"new" | "review" | "known", string>>;
    readonly episodeShort: (order: number) => string;
    readonly episodeLong: (order: number, title: string) => string;
    readonly play: string;
    readonly listen: string;
    readonly slow: string;
    readonly back: string;
    readonly fromStory: string;
    readonly firstSeen: string;
    readonly correct: string;
    readonly correctOf: (correct: number, total: number) => string;
    readonly date: (month: number, day: number) => string;
    readonly practice: string;
    readonly empty: string;
    readonly emptyBody: string;
  };
  readonly review: {
    readonly badge: string;
    readonly question: string;
    readonly close: string;
    readonly progress: (index: number, total: number) => string;
    readonly correctMark: string;
    readonly wrongMark: string;
    readonly right: (word: string) => string;
    readonly wrong: (meaning: string) => string;
    readonly skip: string;
    readonly next: string;
    readonly done: string;
  };
  readonly recommend: {
    readonly hardTitle: string;
    readonly hardBody: string;
    readonly failedTitle: string;
    readonly failedBody: string;
    readonly learn: string;
    readonly later: string;
  };
};
