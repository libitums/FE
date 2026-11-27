import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { saveAuthSession } from "../lib/auth-session";
import type { ChatStreamClient } from "../lib/chat-stream.contract";
import { createCompanionRemote } from "../lib/companion-api";
import { asksBirthYearOnEntry } from "../screens/messenger-chat/guest-gate";
import { entryBirthYearWiring } from "./entry-birth-year-wiring";
import type { NavAction } from "./nav-state";
import {
  messengerChatSource,
  resetMessengerChatSourceForTests,
  setMessengerChatRemote,
} from "./messenger-chat-wiring";

// `integration` 계층(EBY-I1 ~ I2): 가입 직후 ④ 출생 연도 → 결선 경계(ADR-0059 · ADR-0125 개정 2026-11-27). 고른 연도는
// 대화 출처를 지나 서버 `companion_save_profile`(age_source self)로 가고, 메신저 방은 시트를 다시 띄우지 않는다. 서버 저장이
// 실패하면 기기 값이 남아 다음에 출처를 세울 때 다시 보낸다. 대역은 저장소(`NativeModules`)와 서버 응답뿐입니다.

type Save = { readonly p_birth_year: number | null; readonly p_age_source: string | null };

let store: Map<string, string>;
let saves: Save[];
let serverYear: number | null;
let failSaves: boolean;

function tokenFor(sub: string): string {
  return `e30.${btoa(JSON.stringify({ sub })).replace(/=+$/, "")}.sig`;
}

const stream: ChatStreamClient = {
  open: () => ({ streamId: "s", cancel: () => undefined }),
  dispose: () => undefined,
};

const flush = async (times = 6) => {
  for (let i = 0; i < times; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

function installRemote(): void {
  setMessengerChatRemote(() =>
    createCompanionRemote({
      token: async () => "tok",
      config: () => ({ url: "https://example.supabase.co", anonKey: "anon" }),
      post: async (build) => {
        const { url, init } = build({ url: "https://example.supabase.co", anonKey: "anon" });
        if (url.endsWith("companion_save_profile")) {
          const body = JSON.parse(init.body ?? "{}") as Save;
          if (body.p_birth_year === null) return { ok: true, status: 204, bodyText: "" };
          saves.push({ p_birth_year: body.p_birth_year, p_age_source: body.p_age_source });
          if (failSaves) return { ok: true, status: 503, bodyText: "" };
          serverYear = body.p_birth_year;
          return { ok: true, status: 204, bodyText: "" };
        }
        if (url.endsWith("companion_load_profile"))
          return {
            ok: true,
            status: 200,
            bodyText: JSON.stringify({ birthYear: serverYear, l1: null }),
          };
        return { ok: true, status: 200, bodyText: "null" };
      },
      stream: () => stream,
      now: () => 1_000,
    }),
  );
}

function wiringFor(actions: NavAction[]) {
  return entryBirthYearWiring({
    entryEventSink: () => undefined,
    dispatch: (action) => void actions.push(action),
    saveBirthYear: (year) => messengerChatSource((path) => path).setBirthYear(year),
  });
}

beforeEach(() => {
  store = new Map();
  saves = [];
  serverYear = null;
  failSaves = false;
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  resetMessengerChatSourceForTests();
  installRemote();
  saveAuthSession({
    accessToken: tokenFor("new-user"),
    refreshToken: "r",
    expiresAt: 9_999_999_999,
  });
});

afterEach(() => {
  resetMessengerChatSourceForTests();
  setMessengerChatRemote(null);
  vi.unstubAllGlobals();
});

test("EBY-I1 ④에서 고른 연도는 서버 companion_save_profile(self)로 가고, 메신저 방은 생년 시트를 띄우지 않으며 여정 입구로 간다", async () => {
  messengerChatSource((path) => path);
  await flush();
  const actions: NavAction[] = [];

  wiringFor(actions).onContinueLearnerBirthYear(1990);
  await flush();

  expect(saves).toEqual([{ p_birth_year: 1990, p_age_source: "self" }]);
  const birthYear = messengerChatSource((path) => path).snapshot().birthYear;
  expect(birthYear).toEqual({ kind: "set", year: 1990 });
  expect(asksBirthYearOnEntry(birthYear.kind, false)).toBe(false);
  expect(actions).toEqual([{ type: "push", screen: { name: "journey-entry" } }]);
});

test("EBY-I2 서버 저장이 실패하면 기기에 남고, 다음에 출처를 세울 때(앱 재실행) 서버가 비어 있으면 다시 보낸다", async () => {
  failSaves = true;
  messengerChatSource((path) => path);
  await flush();
  wiringFor([]).onContinueLearnerBirthYear(1985);
  await flush();
  expect(saves).toEqual([{ p_birth_year: 1985, p_age_source: "self" }]);
  expect(serverYear).toBeNull();

  // 앱을 다시 켭니다 — 출처 싱글턴만 버리고 기기 저장소 · 세션은 그대로입니다.
  failSaves = false;
  resetMessengerChatSourceForTests();
  installRemote();
  const again = messengerChatSource((path) => path);
  expect(again.snapshot().birthYear).toEqual({ kind: "set", year: 1985 });
  await flush();
  expect(saves).toEqual([
    { p_birth_year: 1985, p_age_source: "self" },
    { p_birth_year: 1985, p_age_source: "self" },
  ]);
  expect(serverYear).toBe(1985);
});
