import { describe, expect, test, vi } from "vitest";

import type {
  ChatStreamClient,
  ChatStreamHandlers,
  ChatStreamRequest,
} from "./chat-stream.contract";
import { createCompanionRemote, type CompanionRemoteDeps } from "./companion-api";

// `unit` 계층(SA-U1 ~ U5): 컴패니언 서버 요청 모양 · 실패 처리(ADR-0137).

const config = { url: "https://example.supabase.co", anonKey: "anon" };

function setup(over: Partial<CompanionRemoteDeps> = {}) {
  const requests: {
    url: string;
    init: { method: string; headers: Record<string, string>; body?: string };
  }[] = [];
  let streamRequest: ChatStreamRequest | null = null;
  let streamHandlers: ChatStreamHandlers | null = null;
  const cancel = vi.fn<() => void>();
  const stream: ChatStreamClient = {
    open: (request, handlers) => {
      streamRequest = request;
      streamHandlers = handlers;
      return { streamId: "s1", cancel };
    },
    dispose: () => undefined,
  };
  const deps: CompanionRemoteDeps = {
    token: async () => "tok",
    config: () => config,
    post: async (build) => {
      const built = build(config);
      requests.push(built as never);
      return { ok: true, status: 200, bodyText: JSON.stringify({ messages: [], hasMore: false }) };
    },
    stream: () => stream,
    now: () => 1_000,
    ...over,
  };
  return {
    remote: createCompanionRemote(deps),
    requests,
    cancel,
    stream: () => ({ request: streamRequest, handlers: streamHandlers }),
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("기록 · 인사", () => {
  test("SA-U1 기록은 RPC companion_list_messages(인물 · 최근 30)를 토큰으로 부른다", async () => {
    const { remote, requests } = setup();
    expect(await remote.loadHistory("duksu")).toEqual({
      messages: [],
      corrections: {},
      ideas: null,
    });
    expect(requests[0]?.url).toBe(
      "https://example.supabase.co/rest/v1/rpc/companion_list_messages",
    );
    expect(requests[0]?.init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(requests[0]?.init.body ?? "")).toEqual({
      p_character_id: "duksu",
      p_before: null,
      p_limit: 30,
    });
  });

  test("SA-U2 인사는 companion-greet에 character_id만 보낸다", async () => {
    const { remote, requests } = setup();
    await remote.greet("mina");
    expect(requests[0]?.url).toBe("https://example.supabase.co/functions/v1/companion-greet");
    expect(JSON.parse(requests[0]?.init.body ?? "")).toEqual({ character_id: "mina" });
    // 해금 선톡은 같은 주소에 trigger를 더해 보낸다.
    await remote.greet("mina", "unlock");
    expect(JSON.parse(requests[1]?.init.body ?? "")).toEqual({
      character_id: "mina",
      trigger: "unlock",
    });
  });

  test("SA-U3 로그인이 없거나 실패 응답이면 null, 던지지 않는다", async () => {
    expect(await setup({ token: async () => null }).remote.loadHistory("duksu")).toBeNull();
    expect(
      await setup({
        post: async () => ({ ok: true, status: 500, bodyText: "x" }),
      }).remote.loadHistory("duksu"),
    ).toBeNull();
    expect(
      await setup({
        post: async () => {
          throw new Error("boom");
        },
      }).remote.greet("duksu"),
    ).toBeNull();
  });
});

describe("턴", () => {
  test("SA-U4 chat-send SSE를 계약 판 · 인물 · 멱등 id · 글로 연다, 이벤트는 이름 · 본문으로 넘긴다", async () => {
    const { remote, stream } = setup();
    const onEvent = vi.fn<(event: string, data: string) => void>();
    const onEnd = vi.fn<(reason: string, detail: string | null) => void>();
    remote.openTurn(
      { characterId: "duksu", text: "안녕하세요", clientMessageId: "c1" },
      { onOpen: () => undefined, onEvent, onEnd },
    );
    await flush();
    const { request, handlers } = stream();
    expect(request?.url).toBe("https://example.supabase.co/functions/v1/chat-send");
    expect(request?.headers.Authorization).toBe("Bearer tok");
    expect(request?.headers.Accept).toBe("text/event-stream");
    expect(JSON.parse(request?.body ?? "")).toEqual({
      contract_version: 1,
      character_id: "duksu",
      client_message_id: "c1",
      text: "안녕하세요",
      input_mode: "text",
    });
    handlers?.onEvent({ event: "delta", id: "1", data: "{}" }, 1);
    handlers?.onEnd("complete", null);
    handlers?.onEnd("complete", null);
    expect(onEvent).toHaveBeenCalledWith("delta", "{}");
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  test("SA-U5 로그인이 없으면 invalid_session으로 한 번 끝나고, 열기 전 취소는 cancelled", async () => {
    const onEnd = vi.fn<(reason: string, detail: string | null) => void>();
    setup({ token: async () => null }).remote.openTurn(
      { characterId: "duksu", text: "x", clientMessageId: "c" },
      { onOpen: () => undefined, onEvent: () => undefined, onEnd },
    );
    await flush();
    expect(onEnd).toHaveBeenCalledWith("http-error", JSON.stringify({ error: "invalid_session" }));

    const onEnd2 = vi.fn<(reason: string, detail: string | null) => void>();
    const { remote, cancel } = setup();
    const handle = remote.openTurn(
      { characterId: "duksu", text: "x", clientMessageId: "c" },
      { onOpen: () => undefined, onEvent: () => undefined, onEnd: onEnd2 },
    );
    handle.cancel();
    await flush();
    expect(onEnd2).toHaveBeenCalledTimes(1);
    expect(onEnd2).toHaveBeenCalledWith("cancelled", null);
    expect(cancel).not.toHaveBeenCalled();
  });

  test("ES-U10 오프라인이면 스트림을 열지 않고 network로 한 번 끝난다(ADR-0138)", async () => {
    const onEnd = vi.fn<(reason: string, detail: string | null) => void>();
    const opened = vi.fn<() => void>();
    const { remote } = setup({
      isOffline: () => true,
      stream: () => ({
        open: () => {
          opened();
          return { streamId: "s", cancel: () => undefined };
        },
        dispose: () => undefined,
      }),
    });
    remote.openTurn(
      { characterId: "duksu", text: "x", clientMessageId: "c" },
      { onOpen: () => undefined, onEvent: () => undefined, onEnd },
    );
    await flush();
    expect(opened).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith("network", null);
  });
});

// `unit` 계층(SA-U6 ~ U8): 학습자 프로필의 생년(ADR-0125 「서버 결선」) — 저장 · 읽기 · 턴과 사진 요청이 저장을 기다림.
describe("프로필 생년", () => {
  test("SA-U6 생년 저장은 companion_save_profile에 생년 · 출처 self만(다른 칸은 null = 그대로)", async () => {
    const { remote, requests } = setup();
    expect(await remote.profile?.saveBirthYear(1995)).toBe(true);
    expect(requests[0]?.url).toBe("https://example.supabase.co/rest/v1/rpc/companion_save_profile");
    expect(requests[0]?.init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(requests[0]?.init.body ?? "")).toEqual({
      p_birth_year: 1995,
      p_age_source: "self",
      p_l1: null,
      p_feedback_mode: null,
    });
    // 함수가 void라 본문이 비어도(204) 성공, 실패 상태 · 토큰 없음은 false.
    const empty = setup({ post: async () => ({ ok: true, status: 204, bodyText: "" }) });
    expect(await empty.remote.profile?.saveBirthYear(1995)).toBe(true);
    const failed = setup({ post: async () => ({ ok: true, status: 400, bodyText: "{}" }) });
    expect(await failed.remote.profile?.saveBirthYear(1995)).toBe(false);
    const signedOut = setup({ token: async () => null });
    expect(await signedOut.remote.profile?.saveBirthYear(1995)).toBe(false);
  });

  test("SA-U7 읽기는 companion_load_profile의 birthYear — 행이 없으면 null, 못 읽으면 null 결과", async () => {
    const reply = (bodyText: string, status = 200) =>
      setup({ post: async () => ({ ok: true, status, bodyText }) }).remote.profile?.load();
    const { remote, requests } = setup({
      post: async (build) => {
        requests.push(build(config) as never);
        return { ok: true, status: 200, bodyText: JSON.stringify({ birthYear: 1990, l1: "en" }) };
      },
    });
    expect(await remote.profile?.load()).toEqual({
      birthYear: 1990,
      replySuggestions: null,
      adultAck: false,
    });
    expect(requests[0]?.url).toBe("https://example.supabase.co/rest/v1/rpc/companion_load_profile");
    expect(await reply(JSON.stringify({ birthYear: null }))).toEqual({
      birthYear: null,
      replySuggestions: null,
      adultAck: false,
    });
    expect(await reply("null")).toEqual({
      birthYear: null,
      replySuggestions: null,
      adultAck: false,
    });
    expect(await reply(JSON.stringify({ birthYear: "1990" }))).toEqual({
      birthYear: null,
      replySuggestions: null,
      adultAck: false,
    });
    expect(await reply(JSON.stringify({ birthYear: null, replySuggestions: false }))).toEqual({
      birthYear: null,
      replySuggestions: false,
      adultAck: false,
    });
    expect(await reply("not json")).toBeNull();
    expect(await reply("{}", 500)).toBeNull();
  });

  test("SA-U9 학습자 언어 맞추기 — 서버 l1이 비었으면 companion_save_profile에 p_l1만(다른 칸 null)", async () => {
    const urls: string[] = [];
    const bodies: unknown[] = [];
    const { remote } = setup({
      post: async (build) => {
        const { url, init } = build(config);
        urls.push(url.slice(url.lastIndexOf("/") + 1));
        bodies.push(JSON.parse(init.body ?? "null"));
        const load = url.endsWith("companion_load_profile");
        return {
          ok: true,
          status: 200,
          bodyText: load ? JSON.stringify({ birthYear: null, l1: null }) : "",
        };
      },
    });
    expect(await remote.profile?.syncL1?.("vi")).toBe(true);
    expect(urls).toEqual(["companion_load_profile", "companion_save_profile"]);
    expect(bodies[1]).toEqual({
      p_birth_year: null,
      p_age_source: null,
      p_l1: "vi",
      p_feedback_mode: null,
    });
  });

  test("SA-U10 서버 l1이 이미 같으면 저장하지 않는다 · 못 읽으면 저장한다", async () => {
    const run = async (loadBody: string, loadStatus = 200) => {
      const urls: string[] = [];
      const { remote } = setup({
        post: async (build) => {
          const { url } = build(config);
          urls.push(url.slice(url.lastIndexOf("/") + 1));
          return url.endsWith("companion_load_profile")
            ? { ok: true, status: loadStatus, bodyText: loadBody }
            : { ok: true, status: 204, bodyText: "" };
        },
      });
      await remote.profile?.syncL1?.("ja");
      return urls;
    };
    expect(await run(JSON.stringify({ birthYear: 1990, l1: "ja" }))).toEqual([
      "companion_load_profile",
    ]);
    expect(await run(JSON.stringify({ birthYear: 1990, l1: "en" }))).toEqual([
      "companion_load_profile",
      "companion_save_profile",
    ]);
    expect(await run("{}", 500)).toEqual(["companion_load_profile", "companion_save_profile"]);
  });

  test("SA-U11 언어를 맞추는 중에 연 턴은 맞춘 뒤에 나간다(첫 답부터 그 언어로)", async () => {
    let finishSave: (() => void) | null = null;
    const { remote, stream } = setup({
      post: async (build) => {
        const { url } = build(config);
        if (url.endsWith("companion_save_profile")) {
          await new Promise<void>((resolve) => {
            finishSave = resolve;
          });
        }
        const body = url.endsWith("companion_load_profile") ? "null" : "{}";
        return { ok: true, status: 200, bodyText: body };
      },
    });
    void remote.profile?.syncL1?.("id");
    remote.openTurn(
      { characterId: "duksu", text: "x", clientMessageId: "c" },
      { onOpen: () => undefined, onEvent: () => undefined, onEnd: () => undefined },
    );
    await flush();
    await flush();
    expect(stream().request).toBeNull();
    finishSave!();
    await flush();
    await flush();
    expect(stream().request).not.toBeNull();
  });

  test("SA-U12 프로필 저장은 차례대로 — 언어 맞추기 중의 생년 저장은 그 뒤에 나가고, 턴은 둘 다 끝난 뒤 나간다", async () => {
    const finishers: (() => void)[] = [];
    const saves: string[] = [];
    const { remote, stream } = setup({
      post: async (build) => {
        const { url, init } = build(config);
        if (url.endsWith("companion_save_profile")) {
          saves.push((init.body ?? "").includes('"p_l1":"vi"') ? "l1" : "birth");
          await new Promise<void>((resolve) => finishers.push(resolve));
        }
        const text = url.endsWith("companion_load_profile") ? "null" : "{}";
        return { ok: true, status: 200, bodyText: text };
      },
    });
    void remote.profile?.syncL1?.("vi");
    void remote.profile?.saveBirthYear(1995);
    remote.openTurn(
      { characterId: "duksu", text: "x", clientMessageId: "c" },
      { onOpen: () => undefined, onEvent: () => undefined, onEnd: () => undefined },
    );
    await flush();
    await flush();
    expect(saves).toEqual(["l1"]);
    finishers.shift()!();
    await flush();
    await flush();
    expect(saves).toEqual(["l1", "birth"]);
    expect(stream().request).toBeNull();
    finishers.shift()!();
    await flush();
    await flush();
    expect(stream().request).not.toBeNull();
  });

  test("SA-U8생년 저장 중에 연 턴 · 사진 요청은 저장이 끝난 뒤 나간다(서버가 그 순간의 나이로 판정)", async () => {
    let finishSave: (() => void) | null = null;
    const order: string[] = [];
    const { remote, stream } = setup({
      post: async (build) => {
        const { url } = build(config);
        if (url.endsWith("companion_save_profile")) {
          await new Promise<void>((resolve) => {
            finishSave = resolve;
          });
        }
        order.push(url.slice(url.lastIndexOf("/") + 1));
        return { ok: true, status: 200, bodyText: "{}" };
      },
    });
    void remote.profile?.saveBirthYear(1995);
    remote.openTurn(
      { characterId: "duksu", text: "x", clientMessageId: "c" },
      { onOpen: () => undefined, onEvent: () => undefined, onEnd: () => undefined },
    );
    void remote.media?.request("snapshot", "m1");
    await flush();
    expect(stream().request).toBeNull();
    expect(order).toEqual([]);
    finishSave!();
    await flush();
    await flush();
    expect(stream().request).not.toBeNull();
    expect(order).toEqual(["companion_save_profile", "companion-snapshot"]);
  });
});

// CP-U10(ADR-0155): 지갑은 `companion_get_wallet`(인자 없음)을 토큰으로 부르고 잔액 · 체험 남은 수를 돌려준다. 실패 · 틀린 응답은 null.
describe("지갑", () => {
  test("CP-U10 지갑은 RPC companion_get_wallet을 부르고 잔액 · 체험 남은 수를 푼다", async () => {
    const env = setup({
      post: async (build) => {
        const built = build(config);
        env.requests.push(built as never);
        return {
          ok: true,
          status: 200,
          bodyText: JSON.stringify({
            tier: "free",
            sub: 0,
            grant: 40,
            paid: 2,
            trialRemaining: 13,
          }),
        };
      },
    });
    expect(await env.remote.wallet?.()).toEqual({ balance: 42, trialRemaining: 13 });
    expect(env.requests.at(-1)?.url).toBe(`${config.url}/rest/v1/rpc/companion_get_wallet`);
    expect(JSON.parse(env.requests.at(-1)?.init.body ?? "null")).toEqual({});
  });

  test("CP-U10 로그인이 없거나 실패 응답이면 null, 던지지 않는다", async () => {
    expect(await setup({ token: async () => null }).remote.wallet?.()).toBeNull();
    const failed = setup({ post: async () => ({ ok: true, status: 500, bodyText: "{}" }) });
    expect(await failed.remote.wallet?.()).toBeNull();
  });
});
