import { describe, expect, it, vi } from "vitest";

import { createTrialSamples } from "./trial-samples-client";
import type { TrialSample, TrialSampleContext, TrialSamplesConfig } from "./trial-samples.contract";

// `unit` 계층: 수집 접점 — 가짜 fetch. 한 번 보내고 잊는다(기다리지 · 던지지 · 재시도하지 않는다).

const CONFIG: TrialSamplesConfig = {
  endpoint: "https://proj.example.test/rest/v1/trial_speech_samples",
  apiKey: "sb_publishable_test_key_0000000000",
};
const CONTEXT: TrialSampleContext = {
  sessionId: "6f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f",
  episodeVersion: "u00-tutorial@1",
  browser: "desktop",
  locale: "en",
};
const SAMPLE: TrialSample = {
  turnIndex: 1,
  expected: "진짜요? 감사합니다!",
  alternatives: ["감사함니다 진짜요"],
  outcome: "lenient",
  similarity: 1,
};

describe("SC1 보내기", () => {
  it("send 한 번 → fetch 한 번(주소 · keepalive · 본문), 반환은 기다리지 않는 undefined", () => {
    const fetchFn = vi.fn(() => Promise.resolve(new Response(null, { status: 201 })));
    const port = createTrialSamples(fetchFn as unknown as typeof fetch, CONFIG, CONTEXT);
    expect(port.send(SAMPLE)).toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(CONFIG.endpoint);
    expect(init).toMatchObject({ method: "POST", keepalive: true, credentials: "omit" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      session_id: CONTEXT.sessionId,
      turn_index: 1,
      outcome: "lenient",
      alternatives: ["감사함니다 진짜요"],
    });
  });
});

describe("SC2 실패는 조용히", () => {
  it("거부 · 오류 응답 · 동기 던짐 모두 삼키고 재시도 0", async () => {
    const rejecting = vi.fn(() => Promise.reject(new TypeError("network")));
    const failing = vi.fn(() => Promise.resolve(new Response(null, { status: 500 })));
    const throwing = vi.fn(() => {
      throw new TypeError("keepalive unsupported");
    });
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      for (const fetchFn of [rejecting, failing, throwing]) {
        const port = createTrialSamples(fetchFn as unknown as typeof fetch, CONFIG, CONTEXT);
        expect(() => port.send(SAMPLE)).not.toThrow();
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(rejecting).toHaveBeenCalledTimes(1);
      expect(failing).toHaveBeenCalledTimes(1);
      expect(throwing).toHaveBeenCalledTimes(1);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });
});
