import { expect, test, vi } from "vitest";

import { noLearnerProfilePort } from "../lib/learner-profile";
import { entryBirthYearWiring } from "./entry-birth-year-wiring";
import { entryWiring } from "./entry-wiring";
import type { NavAction } from "./nav-state";

vi.mock("./push-wiring", () => ({
  syncPushDevice: vi.fn<() => Promise<void>>(async () => undefined),
}));
// 세션 저장소는 경계에서 대체합니다 — 회원(세션 있음) · 비회원(없음) 갈래만 봅니다.
const sessionMock = vi.hoisted(() => ({ signedIn: true }));
vi.mock("../lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/auth-session")>();
  return {
    ...actual,
    loadAuthSession: () =>
      sessionMock.signedIn
        ? { accessToken: "e30.e30.sig", refreshToken: "r", expiresAt: 9_999_999_999 }
        : null,
  };
});

// `unit` 계층(EBY-U1 ~ U3, U1b): 가입 직후 ④ 출생 연도의 결선(ADR-0059 · ADR-0125 개정 2026-11-27) — 언어 선택 다음이 출생
// 연도이고(비회원은 없음), Continue는 저장 → 여정 입구 열람 → push 순서입니다.

function recorder() {
  const log: string[] = [];
  const actions: NavAction[] = [];
  return {
    log,
    actions,
    entryEventSink: (event: { readonly name: string; readonly screen?: string }) =>
      void log.push(`event:${event.name}:${event.screen ?? ""}`),
    dispatch: (action: NavAction) => {
      actions.push(action);
      log.push(`dispatch:${action.type}`);
    },
  };
}

function languageWiring(r: ReturnType<typeof recorder>) {
  return entryWiring({
    entryEventSink: r.entryEventSink,
    analyticsUser: null,
    appVersion: null,
    dispatch: r.dispatch,
    entryLanguage: "en",
    setEntryLanguage: () => undefined,
    syncProgress: async () => undefined,
    learnerRecord: null,
    learnerPort: noLearnerProfilePort,
    saveLearnerProfile: () => undefined,
    syncLearnerProfile: async () => undefined,
    startGuestProgress: () => undefined,
    setAccountState: () => undefined,
  });
}

test("EBY-U1 회원의 ③ 언어 선택 Continue는 ④ 출생 연도 열람 → push다(여정 입구로 바로 가지 않는다)", () => {
  sessionMock.signedIn = true;
  const r = recorder();

  languageWiring(r).onContinueLanguageSelect();

  expect(r.log).toEqual(["event:entry_screen_viewed:learner-birth-year", "dispatch:push"]);
  expect(r.actions).toEqual([{ type: "push", screen: { name: "learner-birth-year" } }]);
});

test("EBY-U1b 비회원(세션 없음)은 ④ 없이 여정 입구로 간다", () => {
  sessionMock.signedIn = false;
  const r = recorder();

  languageWiring(r).onContinueLanguageSelect();

  expect(r.log).toEqual(["event:entry_screen_viewed:journey-entry", "dispatch:push"]);
  expect(r.actions).toEqual([{ type: "push", screen: { name: "journey-entry" } }]);
  sessionMock.signedIn = true;
});

test("EBY-U2 ④ 출생 연도의 Continue는 저장 → 여정 입구 열람 → push다", () => {
  const r = recorder();
  const wiring = entryBirthYearWiring({
    entryEventSink: r.entryEventSink,
    dispatch: r.dispatch,
    saveBirthYear: (year) => void r.log.push(`save:${year}`),
  });

  wiring.onContinueLearnerBirthYear(1990);

  expect(r.log).toEqual(["save:1990", "event:entry_screen_viewed:journey-entry", "dispatch:push"]);
  expect(r.actions).toEqual([{ type: "push", screen: { name: "journey-entry" } }]);
});

test("EBY-U3 ④의 뒤로는 저장 없이 한 칸 뒤(③ 언어 선택)다", () => {
  const r = recorder();
  const wiring = entryBirthYearWiring({
    entryEventSink: r.entryEventSink,
    dispatch: r.dispatch,
    saveBirthYear: (year) => void r.log.push(`save:${year}`),
  });

  wiring.onLearnerBirthYearBack();

  expect(r.log).toEqual(["dispatch:back"]);
});
