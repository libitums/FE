import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { saveAuthSession } from "../lib/auth-session";
import type { ChatStreamClient } from "../lib/chat-stream.contract";
import { createCompanionRemote } from "../lib/companion-api";
import { saveUiLanguage } from "../lib/ui-language";
import {
  messengerChatSource,
  resetMessengerChatSourceForTests,
  setMessengerChatRemote,
} from "./messenger-chat-wiring";

// `integration` 계층(L1-I1): 결선 경계 — 로그인한 회원의 서버 방은 앱 화면 언어를 서버 프로필 l1로 보낸다(2026-11-17 운영: 모든
// 프로필 l1이 비어 번역 · 교정 설명이 영어로만 왔다). 화면 언어를 바꾸면 다시 보내고, 같은 언어면 보내지 않는다.

let store: Map<string, string>;
let saves: (string | null)[];
/** 요청 순서 — `save:<l1>` · `list` · `stream`. */
let order: string[];
let releaseSave: (() => void) | null;
let holdSaves: boolean;

const A1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const history = {
  messages: [
    {
      id: A1,
      role: "assistant",
      origin: "turn",
      status: "complete",
      hidden: false,
      text: null,
      inputMode: null,
      segments: [{ kind: "speech", text: "안녕하세요!", translation: "Hello!" }],
      notice: null,
      feedback: null,
      suggestions: [],
      createdAt: "2026-11-17T10:00:00.000Z",
    },
  ],
  hasMore: false,
};

function tokenFor(sub: string): string {
  const payload = btoa(JSON.stringify({ sub }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `e30.${payload}.sig`;
}

const stream: ChatStreamClient = {
  open: () => {
    order.push("stream");
    return { streamId: "s", cancel: () => undefined };
  },
  dispose: () => undefined,
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  store = new Map();
  saves = [];
  order = [];
  releaseSave = null;
  holdSaves = false;
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  resetMessengerChatSourceForTests();
  setMessengerChatRemote(() =>
    createCompanionRemote({
      token: async () => "tok",
      config: () => ({ url: "https://example.supabase.co", anonKey: "anon" }),
      post: async (build) => {
        const { url, init } = build({ url: "https://example.supabase.co", anonKey: "anon" });
        if (url.endsWith("companion_save_profile")) {
          const body = JSON.parse(init.body ?? "{}") as { p_l1?: string | null };
          if (holdSaves)
            await new Promise<void>((resolve) => {
              releaseSave = resolve;
            });
          saves.push(body.p_l1 ?? null);
          order.push(`save:${body.p_l1 ?? "-"}`);
          return { ok: true, status: 204, bodyText: "" };
        }
        if (url.endsWith("companion_load_profile"))
          return { ok: true, status: 200, bodyText: JSON.stringify({ birthYear: null, l1: null }) };
        if (url.endsWith("companion_list_messages")) {
          order.push("list");
          return { ok: true, status: 200, bodyText: JSON.stringify(history) };
        }
        return { ok: true, status: 200, bodyText: "null" };
      },
      stream: () => stream,
      now: () => 1_000,
    }),
  );
});

afterEach(() => {
  resetMessengerChatSourceForTests();
  setMessengerChatRemote(null);
  vi.unstubAllGlobals();
});

test("L1-I1 화면 언어 vi인 회원의 서버 방은 l1 vi를 보내고, 언어를 바꾸면 다시 · 같은 언어면 보내지 않는다", async () => {
  store.set("libitum.ui.language", "vi");
  saveAuthSession({ accessToken: tokenFor("user-a"), refreshToken: "r", expiresAt: 9_999_999_999 });
  messengerChatSource((path) => path);
  await flush();
  await flush();
  expect(saves.filter((l1) => l1 !== null)).toEqual(["vi"]);

  saveUiLanguage("ja");
  await flush();
  await flush();
  saveUiLanguage("ja");
  await flush();
  await flush();
  expect(saves.filter((l1) => l1 !== null)).toEqual(["vi", "ja"]);
});

test("L1-I2 대화 중 en → vi로 바꾸면 다음 턴은 l1 vi 저장 뒤에 나가고, 이미 받은 답의 번역은 그대로다", async () => {
  store.set("libitum.ui.language", "en");
  saveAuthSession({ accessToken: tokenFor("user-b"), refreshToken: "r", expiresAt: 9_999_999_999 });
  const source = messengerChatSource((path) => path);
  source.openRoom("duksu");
  for (let i = 0; i < 6; i += 1) await flush();
  const oldReply = () =>
    JSON.stringify(source.thread("duksu")?.messages.filter((message) => message.id.startsWith(A1)));
  const before = oldReply();
  expect(before).toContain("Hello!");
  expect(order).toContain("save:en");
  const baseline = order.length;

  // 언어를 바꾸는 저장이 끝나기 전에 보낸 턴은 저장 뒤에 나갑니다.
  holdSaves = true;
  saveUiLanguage("vi");
  source.sendText("duksu", "안녕하세요");
  for (let i = 0; i < 4; i += 1) await flush();
  expect(order.slice(baseline)).toEqual([]);
  releaseSave!();
  for (let i = 0; i < 6; i += 1) await flush();
  expect(order.slice(baseline)).toEqual(["save:vi", "stream"]);

  // 이미 받은 답은 다시 번역하지 않습니다(기록을 다시 읽지도 않음).
  expect(oldReply()).toBe(before);
});
