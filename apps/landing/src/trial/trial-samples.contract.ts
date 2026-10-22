// 인식 글자 수집 — 판정이 끝난 말하기 시도 하나를 Supabase `trial_speech_samples`에 한 줄로 남깁니다.
// 녹음은 하지 않습니다. 사용자 식별 정보 · IP · User-Agent 원문은 싣지 않습니다(열이 닫혀 있습니다).

import type { SpokenOutcome } from "@libitums/episode-core/judge";

import type { TrialBrowser } from "../scripts/analytics.contract";
import type { TrialAction, TrialState } from "./trial-machine.contract";
import type { PreregLocale } from "./trial-prereg.contract";

export type TrialSamplesConfig = { readonly endpoint: string; readonly apiKey: string };

/** 페이지 하나의 문맥 — sessionId는 열 때 만든 무작위 UUID(메모리에만). */
export type TrialSampleContext = {
  readonly sessionId: string;
  readonly episodeVersion: string;
  readonly browser: TrialBrowser;
  readonly locale: PreregLocale;
};

/** 리듀서 전이에서 뽑은 시도 하나 — 접점이 문맥을 더해 행으로 만든다. */
export type TrialSample = {
  readonly turnIndex: number;
  readonly expected: string;
  readonly alternatives: readonly string[];
  readonly outcome: SpokenOutcome;
  readonly similarity: number;
};

/** 보내는 본문 — 열 아홉만. */
export type TrialSampleRow = {
  readonly session_id: string;
  readonly episode_version: string;
  readonly turn_index: number;
  readonly expected: string;
  readonly alternatives: readonly string[];
  readonly outcome: SpokenOutcome;
  readonly similarity: number;
  readonly browser: TrialBrowser;
  readonly locale: PreregLocale;
};

export type TrialSampleRequest = {
  readonly url: string;
  readonly init: {
    readonly method: "POST";
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string;
    readonly credentials: "omit";
    readonly keepalive: true;
  };
};

/** 말하기 턴이 듣는 중에서 `heard`로 판정된 전이만 시도 하나, 그 밖은 null. */
export type TrialSampleOf = (
  prev: TrialState,
  next: TrialState,
  action: TrialAction,
) => TrialSample | null;
/** 자르기(글 200자 · 대안 앞 셋) · 반올림(소수 셋째)을 여기서 한다. */
export type TrialSampleRowOf = (sample: TrialSample, context: TrialSampleContext) => TrialSampleRow;
export type TrialSampleRequestOf = (
  config: TrialSamplesConfig,
  row: TrialSampleRow,
) => TrialSampleRequest;
/** 빌드 때 — URL · 공개 키가 둘 다 있으면 설정(키 모양 검사는 사전 등록과 같음), 아니면 null. */
export type ResolveSamplesConfig = (
  url: string | undefined,
  key: string | undefined,
) => TrialSamplesConfig | null;

export interface TrialSamplesPort {
  /** 기다리지 않는다 · 던지지 않는다 · 재시도하지 않는다. */
  send(sample: TrialSample): void;
}
export type CreateTrialSamples = (
  fetchFn: typeof fetch,
  config: TrialSamplesConfig,
  context: TrialSampleContext,
) => TrialSamplesPort;
