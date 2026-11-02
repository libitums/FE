// 틀린 문제 다시 풀기(ADR-0058 ⟨2026-10-30⟩)의 문구 타입입니다 — `ui-copy-sections.contract.ts`가 300줄에 닿아 따로 둡니다.

export type LearningReviewCopy = {
  /** 다시 풀기 첫 문항 위에 한 번 뜨는 알약입니다 — `Let’s fix 2 mistakes`. 낭독도 같은 글입니다. */
  readonly intro: (count: number) => string;
  /** 헤더 칩 — 통과까지 더 맞혀야 하는 수가 남았을 때입니다. `1 more to pass`. */
  readonly remaining: (count: number) => string;
  /** 헤더 칩 — 통과선을 넘은 뒤입니다. */
  readonly unlocked: string;
  /** 세션 헤더의 순번입니다 — `Review 1 / 3`. */
  readonly progress: (ordinal: number, total: number) => string;
  /** 세션 헤더 막대의 낭독 이름입니다. */
  readonly headerOf: (formLabel: string, ordinal: number, total: number) => string;
  /** 학습형 이름표 뒤에 붙는 꼬리입니다 — `Word choice · try again`. */
  readonly formSuffix: string;
  /** 다시 푼 문항을 맞혔을 때 아래 판의 제목입니다. */
  readonly fixed: string;
  /** 또 틀렸을 때 아래 판의 제목 · 줄입니다(학습형이 해설을 주면 그것을 씁니다). */
  readonly missed: string;
  readonly missedLine: string;
};

/** 다시 풀고 온 결과 화면의 문구입니다. */
export type LessonCompleteReviewCopy = {
  /** 다시 풀고도 미통과일 때의 제목입니다. */
  readonly soClose: string;
  /** `YOU FIXED 2 OF 3 MISTAKES` */
  readonly fixedOf: (fixed: number, total: number) => string;
  /** 점 줄의 낭독 이름입니다. */
  readonly dotsLabel: (fixed: number, total: number) => string;
  /** 미통과 아래 한 줄 — 모자란 수와 다시 하자는 말입니다. */
  readonly neededMore: (count: number) => string;
};
