import { afterEach, describe, expect, it, vi } from "vitest";

import { createTrialPrereg, PREREG_TIMEOUT_MS } from "./trial-prereg-client";
import type { TrialPreregConfig } from "./trial-prereg.contract";

// `unit` 계층: 사전 등록 접점 — 가짜 fetch로 응답 해석 · 던지지 않음 · 상한 시간을 본다(실제 주소에 닿지 않음).

const config: TrialPreregConfig = {
  endpoint: "https://proj.example.test/rest/v1/pre_registrations",
  apiKey: "sb_publishable_test_key_0000000000",
};

type Call = { url: string; init: RequestInit };

function fakeFetch(answer: (call: Call) => Promise<Response>) {
  const calls: Call[] = [];
  const fn = ((url: string, init: RequestInit) => {
    const call = { url: String(url), init };
    calls.push(call);
    return answer(call);
  }) as unknown as typeof fetch;
  return { fn, calls };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createTrialPrereg", () => {
  it("PC1 201 → submitted, 요청은 정규화된 email · locale · 머리 그대로 한 번", async () => {
    const fake = fakeFetch(() => Promise.resolve(new Response(null, { status: 201 })));
    const port = createTrialPrereg(fake.fn, config);
    await expect(port.submit("mina@example.com", "en")).resolves.toBe("submitted");
    expect(fake.calls).toHaveLength(1);
    const [call] = fake.calls;
    expect(call?.url).toBe(config.endpoint);
    expect(call?.init.method).toBe("POST");
    expect(JSON.parse(String(call?.init.body))).toEqual({
      email: "mina@example.com",
      locale: "en",
      source: "web-trial",
    });
    const headers = (call?.init.headers ?? {}) as Record<string, string>;
    expect(headers.apikey).toBe(config.apiKey);
    expect(call?.init.signal).toBeInstanceOf(AbortSignal);
  });

  it("PC2 409 → duplicate, 500 → failed", async () => {
    const conflict = fakeFetch(() =>
      Promise.resolve(new Response('{"code":"23505"}', { status: 409 })),
    );
    await expect(createTrialPrereg(conflict.fn, config).submit("a@b.co", "ko")).resolves.toBe(
      "duplicate",
    );
    const broken = fakeFetch(() => Promise.resolve(new Response("", { status: 500 })));
    await expect(createTrialPrereg(broken.fn, config).submit("a@b.co", "ko")).resolves.toBe(
      "failed",
    );
  });

  it("PC3 fetch가 던지면(네트워크) failed — 던지지 않는다", async () => {
    const offline = fakeFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    await expect(createTrialPrereg(offline.fn, config).submit("a@b.co", "en")).resolves.toBe(
      "failed",
    );
  });

  it("PC4 상한 시간(10초)이 지나면 abort하고 failed", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null = null;
    const hanging = fakeFetch(
      (call) =>
        new Promise<Response>((_resolve, reject) => {
          signal = call.init.signal ?? null;
          signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    expect(PREREG_TIMEOUT_MS).toBe(10_000);
    const pending = createTrialPrereg(hanging.fn, config).submit("a@b.co", "en");
    await vi.advanceTimersByTimeAsync(PREREG_TIMEOUT_MS - 1);
    expect((signal as AbortSignal | null)?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toBe("failed");
    expect((signal as AbortSignal | null)?.aborted).toBe(true);
  });
});
