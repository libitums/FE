// 서버 진행을 불러오는 상태 기계의 타입입니다. 설계: docs/adr/0062-progress-cache-first.md

export type ProgressLoadPhase =
  | "idle"
  | "hydrated"
  | "checking"
  | "loading"
  | "failed"
  | "retrying"
  | "loaded";
export type ProgressLocalSnapshot = "restored" | "none";
export type ProgressLoadOutcome = "loaded" | "failed";
export type ProgressLoadAction =
  | { readonly type: "started"; readonly local: ProgressLocalSnapshot }
  | { readonly type: "delayElapsed" }
  | { readonly type: "settled"; readonly outcome: ProgressLoadOutcome }
  | { readonly type: "retryRequested" };
