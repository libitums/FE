// 서버 진행을 불러오는 동안 맵 화면이 받는 상태입니다. 설계: docs/adr/0062-progress-cache-first.md

export type JourneyMapProgressLoad =
  | { readonly status: "known" }
  | { readonly status: "checking" }
  | { readonly status: "loading" }
  | { readonly status: "retrying" }
  | { readonly status: "failed"; readonly onRetry: () => void };

/** 노드를 누를 수 있는가입니다. 응답을 기다리는 동안만 `checking`입니다. */
export type JourneyMapNodeAccess = "open" | "checking";

export type JourneyProgressLoadRowProps =
  | { readonly status: "loading" }
  | {
      readonly status: "failed";
      readonly onRetry: () => void;
      /** 화면 겹침 레이어(스텝 말풍선 · 첫 유닛 안내)가 떠 있으면 참 — 재시도 버튼을 낭독에서 가립니다. */
      readonly obscured?: boolean;
    };

export type ProgressLoadCopy = {
  readonly loading: string;
  /** 스크린리더용 문구입니다 — 말줄임표 없이 읽힙니다. */
  readonly loadingAnnouncement: string;
  readonly failed: string;
  readonly retry: string;
};

export type JourneyProgressLoadRowTestId =
  | "journey-progress-load-row"
  | "journey-progress-load-row-spinner"
  | "journey-progress-load-row-message"
  | "journey-progress-load-row-retry";
