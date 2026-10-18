import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { returningLearnerWaitMs } from "./returning-learner";
import { resetPushWiringForTests } from "./push-wiring";
import {
  accessTokenWithSub,
  advance,
  answer,
  bootToOnboarding,
  completeOnboarding,
  deferredReply,
  eventNames,
  jsonReply,
  learnerProfileRecord,
  noRecord,
  novelProgress,
  phoneUntilCode,
  present,
  settle,
  startedProgress,
  stubHost,
  stubServer,
  tapButtonIn,
  tapSocial,
  typeText,
  unavailableReply,
  waitFor,
} from "./test-helpers/returning-login-harness";
import type { Responder } from "./test-helpers/returning-login-harness";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { uiLanguageStorageKey } from "../lib/ui-language";

// `integration` 계층: 로그인 직후 서버 기록(진행 · 프로필)으로 맵 또는 언어 선택이 갈리는 흐름을 실제 App
// 한 트리에서 봅니다. 경계(저장소 · 웹 인증 · Apple · 푸시 · fetch)만 대역입니다.

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const entered = (method: string): string => `entry_returning_learner_entered:${method}`;
const onMap = (): boolean => present("journey-map-screen");
const progressOf = (value: unknown): Responder => answer(jsonReply(value));

test("[RL1] 서버 진행이 있는 계정은 구글 로그인 뒤 언어 선택 없이 맵으로 간다", async () => {
  stubServer({ progress: progressOf(startedProgress), profile: noRecord });
  const host = stubHost();
  const events = bootToOnboarding();
  completeOnboarding();
  await tapSocial("google");

  expect(onMap()).toBe(true);
  expect(present("language-select-screen-title")).toBe(false);
  expect(present("journey-entry-screen-title")).toBe(false);
  expect(present("ui-lynx-bottom-navigator")).toBe(true);
  const names = eventNames(events);
  expect(names.slice(-2)).toEqual(["entry_login_method_selected:google", entered("google")]);
  expect(names).not.toContain("entry_completed");
  expect(names).not.toContain("viewed:language-select");
  expect(names).not.toContain("viewed:journey-entry");
  expect(host.register).toHaveBeenCalledTimes(1);
});

test("[RL2] 서버 프로필만 있는 계정도 애플 로그인 뒤 맵으로 간다", async () => {
  stubServer({ progress: noRecord, profile: progressOf(learnerProfileRecord) });
  stubHost();
  const events = bootToOnboarding();
  completeOnboarding();
  await tapSocial("apple");

  expect(onMap()).toBe(true);
  expect(eventNames(events).filter((name) => name === entered("apple"))).toHaveLength(1);
});

test("[RL3] 전화 로그인도 비주얼 노벨 진행만으로 맵으로 간다", async () => {
  stubServer({ progress: progressOf(novelProgress), profile: noRecord });
  stubHost();
  const events = bootToOnboarding();
  completeOnboarding();
  await phoneUntilCode();
  tapButtonIn("verification-code-screen-submit");
  await settle();

  expect(onMap()).toBe(true);
  expect(eventNames(events).slice(-2)).toEqual(["viewed:verification-code", entered("phone")]);
  expect(eventNames(events)).not.toContain("entry_completed");
});

test.each(["google", "phone"] as const)(
  "[RL4] 기록이 없는 계정(%s)은 지금 흐름대로 언어 선택 → 여정 입장 → 맵이다",
  async (method) => {
    stubServer({ progress: noRecord, profile: noRecord });
    const host = stubHost();
    const events = bootToOnboarding();
    completeOnboarding();
    if (method === "phone") {
      await phoneUntilCode();
      tapButtonIn("verification-code-screen-submit");
      await settle();
    } else {
      await tapSocial(method);
    }
    expect(present("language-select-screen-title")).toBe(true);
    tapButtonIn("language-select-screen-next");
    tapButtonIn("journey-entry-screen-start");
    await settle();

    expect(onMap()).toBe(true);
    expect(eventNames(events).filter((name) => name === "entry_completed")).toHaveLength(1);
    expect(eventNames(events).some((name) => name.startsWith("entry_returning"))).toBe(false);
    expect(host.register).toHaveBeenCalledTimes(1);
  },
);

const failures: readonly (readonly [string, Responder, Responder])[] = [
  ["두 RPC 503", answer(unavailableReply), answer(unavailableReply)],
  ["깨진 진행 JSON", answer({ status: 200, body: "{bad" }), noRecord],
  ["모르는 버전", progressOf({ version: 2 }), noRecord],
  ["요청 예외", () => Promise.reject(new Error("offline")), noRecord],
];

test.each(failures)(
  "[RL5] 조회가 실패해도(%s) 언어 선택으로 간다",
  async (_name, progress, profile) => {
    stubServer({ progress, profile });
    stubHost();
    bootToOnboarding();
    completeOnboarding();
    await tapSocial("google");

    expect(present("language-select-screen-title")).toBe(true);
    expect(present("login-screen-error")).toBe(false);
    expect(onMap()).toBe(false);
  },
);

test("[RL6] 판정이 늦으면 소셜 버튼이 로딩인 채 3초까지 기다리다 언어 선택으로 간다", async () => {
  const progress = deferredReply();
  const profile = deferredReply();
  stubServer({ progress: waitFor(progress), profile: waitFor(profile) });
  const host = stubHost();
  const events = bootToOnboarding();
  completeOnboarding();
  await tapSocial("google");
  await advance(returningLearnerWaitMs - 1);

  expect(present("login-screen-method-google")).toBe(true);
  const google = screen.getByTestId("login-screen-method-google");
  expect(google.getAttribute("data-status")).toBe("requesting");
  const button = within(google).getByTestId("ui-lynx-button");
  expect(button.getAttribute("data-loading")).toBe("true");
  expect(within(google).queryByTestId("ui-lynx-button-spinner")).not.toBeNull();
  const starts = host.webStarts.length;
  tapButtonIn("login-screen-method-facebook");
  await settle();
  expect(host.webStarts).toHaveLength(starts);

  await advance(1);
  expect(present("language-select-screen-title")).toBe(true);
  progress.resolve(jsonReply(startedProgress));
  await settle();
  expect(present("language-select-screen-title")).toBe(true);
  expect(present("ui-lynx-bottom-navigator")).toBe(false);
  expect(eventNames(events)).not.toContain(entered("google"));
});

test("[RL7] 프로필이 있으면 진행 응답을 기다리지 않고 바로 맵으로 간다", async () => {
  stubServer({
    progress: waitFor(deferredReply()),
    profile: progressOf(learnerProfileRecord),
  });
  stubHost();
  bootToOnboarding();
  completeOnboarding();
  await tapSocial("google");

  expect(onMap()).toBe(true);
});

test("[RL8] 전화 로그인도 판정이 끝날 때까지 확인 버튼이 로딩이다", async () => {
  const progress = deferredReply();
  const profile = deferredReply();
  stubServer({ progress: waitFor(progress), profile: waitFor(profile) });
  stubHost();
  bootToOnboarding();
  completeOnboarding();
  await phoneUntilCode();
  tapButtonIn("verification-code-screen-submit");
  await settle();

  expect(present("verification-code-screen-submit")).toBe(true);
  const submit = screen.getByTestId("verification-code-screen-submit");
  expect(submit.getAttribute("data-status")).toBe("verifying");
  expect(within(submit).getByTestId("ui-lynx-button").getAttribute("data-loading")).toBe("true");
  progress.resolve(jsonReply(null));
  profile.resolve(jsonReply(null));
  await settle();
  expect(present("language-select-screen-title")).toBe(true);
});

test("[RL9] 맵으로 바로 가도 UI 언어는 영어로 저장되고, 이미 저장된 언어는 덮지 않는다", async () => {
  stubServer({ progress: progressOf(startedProgress), profile: noRecord });
  const host = stubHost();
  bootToOnboarding();
  completeOnboarding();
  await tapSocial("google");
  expect(onMap()).toBe(true);
  expect(host.store.get(uiLanguageStorageKey)).toBe("en");
  expect(host.store.has(authSessionStorageKey)).toBe(true);
  cleanup();
  vi.useRealTimers();

  const saved = stubHost({ [uiLanguageStorageKey]: "ja" });
  bootToOnboarding();
  completeOnboarding();
  await tapSocial("google");
  expect(onMap()).toBe(true);
  expect(saved.store.get(uiLanguageStorageKey)).toBe("ja");
});

test("[RL10] 세션 갱신 부팅은 알림 권한을 묻지 않는다", async () => {
  stubServer({ progress: noRecord, profile: noRecord });
  const host = stubHost({
    [authSessionStorageKey]: serializeAuthSession({
      accessToken: accessTokenWithSub,
      refreshToken: "r",
      expiresAt: 4_102_444_800_000,
    }),
  });
  vi.useFakeTimers();
  render(<App />);
  await advance(entrySplashDurationMs);
  await settle();

  expect(onMap()).toBe(true);
  expect(host.register).not.toHaveBeenCalled();
});

function pickProfileOnLastOnboardingStep(): void {
  for (let step = 0; step < 3; step += 1) tapButtonIn("onboarding-screen-next");
  typeText("Emma");
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-country")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
  fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-DE"), {});
  tapButtonIn("onboarding-screen-next");
}

test("[RL11] 프로필 업로드는 서버 조회(판정) 뒤에 한 번 나간다", async () => {
  const server = stubServer({ progress: noRecord, profile: noRecord });
  stubHost();
  bootToOnboarding();
  pickProfileOnLastOnboardingStep();
  await tapSocial("google");
  await advance(0);

  expect(present("language-select-screen-title")).toBe(true);
  const firstLoad = server.rpcs.indexOf("load_learner_profile");
  const saves = server.rpcs.filter((rpc) => rpc === "save_learner_profile");
  expect(firstLoad).toBeGreaterThanOrEqual(0);
  expect(saves).toHaveLength(1);
  expect(firstLoad).toBeLessThan(server.rpcs.indexOf("save_learner_profile"));
});

test("[RL12] 세션 갱신 부팅에서도 프로필 동기화가 시작되고 재진입 이벤트는 없다", async () => {
  const server = stubServer({ progress: noRecord, profile: noRecord });
  stubHost({
    [authSessionStorageKey]: serializeAuthSession({
      accessToken: accessTokenWithSub,
      refreshToken: "r",
      expiresAt: 4_102_444_800_000,
    }),
  });
  const events: string[] = [];
  vi.useFakeTimers();
  render(<App entryEventSink={(event) => events.push(event.name)} />);
  await advance(entrySplashDurationMs);
  await settle();

  expect(onMap()).toBe(true);
  expect(server.rpcs).toContain("load_learner_profile");
  expect(events).not.toContain("entry_returning_learner_entered");
});
