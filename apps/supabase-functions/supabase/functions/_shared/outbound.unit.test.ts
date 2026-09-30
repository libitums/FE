import { describe, expect, test, vi } from "vitest";

import { outboundTimeoutMs, timedOutbound } from "./outbound.ts";

type FetchArgs = [string | URL | Request, RequestInit | undefined];

describe("FO1 timedOutbound", () => {
  test("제한 시간은 10초다", () => {
    expect(outboundTimeoutMs).toBe(10_000);
  });

  test("요청 모양을 fetch에 그대로 넘기고 status · text()를 전달한다", async () => {
    const fetchDouble = vi.fn(
      async (..._args: FetchArgs) => new Response("hello", { status: 201 }),
    );
    const outbound = timedOutbound(fetchDouble as unknown as typeof fetch, 50);
    const response = await outbound({
      url: "https://x.test/a",
      method: "POST",
      headers: { A: "1" },
      body: "payload",
    });
    expect(response.status).toBe(201);
    await expect(response.text()).resolves.toBe("hello");
    expect(fetchDouble).toHaveBeenCalledTimes(1);
    const [url, init] = fetchDouble.mock.calls[0]!;
    expect(url).toBe("https://x.test/a");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ A: "1" });
    expect(init?.body).toBe("payload");
  });

  test("본문 null이면 fetch에 본문을 싣지 않는다", async () => {
    const fetchDouble = vi.fn(async (..._args: FetchArgs) => new Response(null, { status: 204 }));
    const outbound = timedOutbound(fetchDouble as unknown as typeof fetch, 50);
    await outbound({ url: "https://x.test/a", method: "GET", headers: {}, body: null });
    const init = fetchDouble.mock.calls[0]![1];
    expect(init?.body ?? undefined).toBeUndefined();
  });

  test("제한 시간을 넘기면 거부한다", async () => {
    const fetchDouble = vi.fn(
      (...[, init]: FetchArgs) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const outbound = timedOutbound(fetchDouble as unknown as typeof fetch, 50);
    await expect(
      outbound({ url: "https://x.test/a", method: "GET", headers: {}, body: null }),
    ).rejects.toBeDefined();
  });
});
