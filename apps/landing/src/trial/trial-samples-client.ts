// 수집 접점 — PostgREST로 한 번 보내고 잊습니다. 기다리지 않고 · 던지지 않고 · 재시도하지 않습니다.

import { trialSampleRequestOf, trialSampleRowOf } from "./trial-samples";
import type { CreateTrialSamples } from "./trial-samples.contract";

export const createTrialSamples: CreateTrialSamples = (fetchFn, config, context) => ({
  send(sample) {
    const { url, init } = trialSampleRequestOf(config, trialSampleRowOf(sample, context));
    try {
      fetchFn(url, init).catch(() => undefined);
    } catch {
      // keepalive를 모르는 엔진 · 막힌 요청 — 수집은 진행을 막지 않습니다.
    }
  },
});
