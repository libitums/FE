// 스플래시의 에피소드 갱신이 끝나 스플래시가 나가는 순간 내는 측정 이벤트입니다. 설계: docs/adr/0078-…md
export type EpisodeUpdateSplashOutcome =
  | "unchecked"
  | "nothing"
  | "complete"
  | "timed-out"
  | "failed";
export type EpisodeUpdateSplashClosedEvent = {
  readonly name: "episode_update_splash_closed";
  readonly outcome: EpisodeUpdateSplashOutcome;
  /** 10진 정수 문자열 ms — 로고 끝(또는 안전 타이머) → 나감. 로고 끝이 없었으면 "0". */
  readonly waitMs: string;
  /** 10진 정수 문자열 ms — 받기 시작(App 루트 effect) → 나감. */
  readonly splashMs: string;
  /** 스플래시가 기다린 에피소드 수(new + changed). 게이지가 없었으면 "0". */
  readonly episodeCount: string;
  /** 이번 시작에서 활성으로 올린 에피소드 수(시작 직후 + 나갈 때). */
  readonly replacedCount: string;
};
