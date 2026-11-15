// 스냅샷 · 음성 백그라운드 작업의 시간 예산(리뷰 반영 2026-11-14, ADR-0146 적용 기록).
//
// `waitUntil` 작업도 Edge Function 실행 상한 안에서만 돈다. 이 저장소는 상한을 150초로 본다(`supabase/cron/companion.sql`).
// 옛 제한 시간(이미지 300초 × 2 · 텍스트 90초 × 2)은 상한을 넘어, 작업이 도중에 죽고 pending이 만료 정리로 닫혔다.
// 그래서 요청 받은 때부터 `jobBudgetMs`(140초, 10초 여유) 안에 끝나게 한다:
// - 단계마다 `min(단계 상한, 남은 시간 − 뒤에 남길 몫)`만 기다린다. 그 값이 단계의 최소 시도 시간보다 작으면 시도하지 않는다.
// - 엔진 재시도도 같다 — 남은 예산이 최소 시도 시간에 못 미치면 다시 하지 않는다(중간에 끊는 이미지 호출도 돈이 든다).
// - 뒤에 남길 몫 = 뒤 단계의 몫 + 닫기(`companion_media_finish`, 바깥 호출 제한 10초).
// 최악 경로(모든 단계가 제한 시간을 다 씀)도 닫기까지 140초 안이다(단위 테스트 MB2). pending 만료 하한(5분)은 150초보다 길다(MB4).

/** Edge Function 실행 상한(저장소 기준). 플랜이 400초여도 이 값으로 둔다 — 늘리려면 이 값과 만료 하한을 같이 본다. */
export const edgeWallClockMs = 150_000;
/** 요청 받은 때부터 작업이 닫기까지 끝나야 하는 시간. */
export const jobBudgetMs = 140_000;
/** 닫기 RPC 한 번(바깥 호출 제한 `outboundTimeoutMs`). */
export const finishReserveMs = 10_000;

/** 단계 하나: 상한 · 최소 시도 시간 · 이 단계 뒤에 남겨 둘 시간. */
export type Phase = { readonly capMs: number; readonly minMs: number; readonly tailMs: number };

const checkMs = 20_000;
const uploadMs = 15_000;
const imageMinMs = 60_000;
const promptMinMs = 10_000;

/**
 * 스냅샷: 기준 이미지 → 프롬프트 노드 → 이미지(재시도 한 번) → 검사 노드 → 올리기 → 닫기.
 * 이미지 최소 60초 — 실험실에서 한 장에 1분 안팎(ADR-0146 맥락 3). 그보다 짧게 걸면 거의 끊기고 비용만 든다.
 */
export const SNAPSHOT_PHASES = {
  refs: {
    capMs: 30_000,
    minMs: 3_000,
    tailMs: promptMinMs + imageMinMs + checkMs + uploadMs + finishReserveMs,
  },
  prompt: {
    capMs: 90_000,
    minMs: 5_000,
    tailMs: imageMinMs + checkMs + uploadMs + finishReserveMs,
  },
  image: { capMs: 300_000, minMs: imageMinMs, tailMs: checkMs + uploadMs + finishReserveMs },
  check: { capMs: 90_000, minMs: 5_000, tailMs: uploadMs + finishReserveMs },
  upload: { capMs: 30_000, minMs: 3_000, tailMs: finishReserveMs },
} as const satisfies Record<string, Phase>;

/** 음성: ElevenLabs(재시도 한 번) → 올리기 → 닫기. */
export const VOICE_PHASES = {
  speech: { capMs: 90_000, minMs: 10_000, tailMs: uploadMs + finishReserveMs },
  upload: { capMs: 30_000, minMs: 3_000, tailMs: finishReserveMs },
} as const satisfies Record<string, Phase>;

export type Budget = {
  readonly remainingMs: () => number;
  /** 이 단계에 줄 제한 시간. 최소 시도 시간도 못 주면 null(시도하지 않는다). `capMs`는 단계 상한 덮어쓰기(테스트 · 설정). */
  readonly timeoutFor: (phase: Phase, capMs?: number) => number | null;
};

export function createBudget(nowMs: () => number, deadlineMs: number): Budget {
  const remainingMs = () => Math.max(0, deadlineMs - nowMs());
  return {
    remainingMs,
    timeoutFor: (phase, capMs) => {
      const timeout = Math.min(capMs ?? phase.capMs, remainingMs() - phase.tailMs);
      return timeout < phase.minMs ? null : timeout;
    },
  };
}
