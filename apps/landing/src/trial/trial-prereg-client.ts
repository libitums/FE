// 사전 등록 접점 — PostgREST로 한 번 보냅니다. 던지지 않습니다(네트워크 · 상한 시간 · 그 밖 → "failed").

import type { CreateTrialPrereg } from "./trial-prereg.contract";
import { preregOutcomeOf, preregRequestOf } from "./trial-prereg";

/** 응답을 기다리는 상한(ms). */
export const PREREG_TIMEOUT_MS = 10_000;

export const createTrialPrereg: CreateTrialPrereg = (
  fetchFn,
  config,
  timeoutMs = PREREG_TIMEOUT_MS,
) => ({
  async submit(email, locale) {
    const { url, init } = preregRequestOf(config, email, locale);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchFn(url, { ...init, signal: controller.signal });
      return preregOutcomeOf(response.status);
    } catch {
      return preregOutcomeOf("network");
    } finally {
      clearTimeout(timer);
    }
  },
});
