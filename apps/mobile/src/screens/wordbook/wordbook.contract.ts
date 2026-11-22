// My words(단어장) 화면 셋의 prop 계약과 testid입니다(ADR-0169). 타입만 둡니다.

import type { WordbookEntry } from "../../app/wordbook-entries";

/** 단어 소리 포트 — 단어 → 재생 주소(없으면 null) · 재생(느리게는 0.85, `lib/listen-pace.ts`). */
export type WordSoundPort = {
  readonly sourceOf: (entry: WordbookEntry) => string | null;
  readonly play: (source: string, slow: boolean) => void;
};

export type WordbookFilter = "all" | "starred" | "new" | "review" | "known";

export type WordbookScreenProps = {
  readonly entries: readonly WordbookEntry[];
  /** 오늘 복습할 수. */
  readonly dueCount: number;
  readonly sound: WordSoundPort;
  readonly onOpenWord: (entry: WordbookEntry) => void;
  readonly onReview: () => void;
  /** 줄의 별을 누름 — 바뀐 뒤 값(ADR-0169 즐겨찾기 개정). */
  readonly onToggleStar: (entry: WordbookEntry, starred: boolean) => void;
  /** 걸러보기 칩을 바꿈(이벤트). */
  readonly onFilterChange: (filter: WordbookFilter) => void;
};

export type WordbookWordScreenProps = {
  /** 카탈로그에서 사라졌으면 null — 뒤로만 남습니다. */
  readonly entry: WordbookEntry | null;
  readonly sound: WordSoundPort;
  readonly onBack: () => void;
  readonly onPractice: () => void;
};

export type WordbookReviewScreenProps = {
  readonly queue: readonly WordbookEntry[];
  /** 오답 보기 재료(뜻). */
  readonly pool: readonly string[];
  readonly sound: WordSoundPort;
  readonly onAnswer: (entry: WordbookEntry, correct: boolean) => void;
  readonly onClose: () => void;
};

export const wordbookTestIds = {
  screen: "wordbook-screen",
  reviewCta: "wordbook-review-cta",
  filter: (filter: WordbookFilter) => `wordbook-filter-${filter}`,
  row: (index: number) => `wordbook-row-${index}`,
  rowPlay: (index: number) => `wordbook-row-${index}-play`,
  rowStar: (index: number) => `wordbook-row-${index}-star`,
  empty: "wordbook-empty",
  emptyStarred: "wordbook-empty-starred",
  word: "wordbook-word",
  listen: "wordbook-listen",
  slow: "wordbook-slow",
  practice: "wordbook-practice",
  back: "wordbook-back",
  review: "wordbook-review",
  choice: (index: number) => `wordbook-choice-${index}`,
  feedback: "wordbook-feedback",
  reviewNext: "wordbook-review-next",
  reviewClose: "wordbook-review-close",
} as const;
