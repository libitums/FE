// 진행 불러오기 상태 전이에서 내는 측정 이벤트입니다. 설계: docs/adr/0062-progress-cache-first.md

export type ProgressLoadDelayedEvent = { readonly name: "progress_load_delayed" };
export type ProgressLoadFailedEvent = {
  readonly name: "progress_load_failed";
  readonly attempt: "first" | "retry";
};
export type ProgressLoadRecoveredEvent = {
  readonly name: "progress_load_recovered";
  readonly trigger: "manual" | "auto";
};
export type ProgressLoadEvent =
  | ProgressLoadDelayedEvent
  | ProgressLoadFailedEvent
  | ProgressLoadRecoveredEvent;
