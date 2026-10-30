import { expect, test } from "vitest";

import { entryWiring } from "./entry-wiring";
import type { EntryWiringArgs } from "./entry-wiring";
import type { NavAction } from "./nav-state";
import { noLearnerProfilePort } from "../lib/learner-profile";
import type { LearnerProfileRecord } from "../lib/learner-profile.contract";

// 가입 직후 ① 이름 · ② 나라의 결선(ADR-0059 D7 2026-10-20)입니다 — 전이 · 저장 · 이벤트 순서만 봅니다.

const emma: LearnerProfileRecord = { name: "Emma", countryCode: "DE" };

function harness(learnerRecord: LearnerProfileRecord | null) {
  const log: string[] = [];
  const actions: NavAction[] = [];
  const args: EntryWiringArgs = {
    entryEventSink: (event) =>
      void log.push(
        `event:${event.name}${"screen" in event ? `:${event.screen}` : ""}${"entry" in event ? `:${event.entry}:${event.change}` : ""}`,
      ),
    analyticsUser: null,
    appVersion: null,
    dispatch: (action) => {
      actions.push(action);
      log.push(`dispatch:${action.type}`);
    },
    entryLanguage: "en",
    setEntryLanguage: () => undefined,
    syncProgress: async () => undefined,
    learnerRecord,
    learnerPort: noLearnerProfilePort,
    saveLearnerProfile: (record) => void log.push(`save:${record.name}:${record.countryCode}`),
    syncLearnerProfile: async () => undefined,
  };
  return { log, actions, wiring: entryWiring(args) };
}

test("EW1. 온보딩 완료는 값 없이 로그인으로 간다", () => {
  const { log, actions, wiring } = harness(null);

  wiring.onOnboardingComplete();

  expect(log).toEqual(["event:entry_screen_viewed:login", "dispatch:push"]);
  expect(actions).toEqual([{ type: "push", screen: { name: "login" } }]);
});

test("EW2. ① 이름의 Continue는 친 이름을 route에 남기고 ② 나라로 간다", () => {
  const { log, actions, wiring } = harness(null);

  wiring.onContinueLearnerName("Mai");

  expect(actions).toEqual([
    { type: "replace", screen: { name: "learner-name", initialName: "Mai" } },
    { type: "push", screen: { name: "learner-country", learnerName: "Mai" } },
  ]);
  expect(log).toContain("event:entry_screen_viewed:learner-country");
  expect(log.some((line) => line.startsWith("save"))).toBe(false);
});

test("EW3. ② 나라의 Continue는 저장 → 저장 이벤트(signup · created) → 언어 선택 순이다", () => {
  const { log, actions, wiring } = harness(null);

  wiring.onContinueLearnerCountry(emma);

  expect(log).toEqual([
    "save:Emma:DE",
    "event:learner_profile_saved:signup:created",
    "event:entry_screen_viewed:language-select",
    "dispatch:push",
  ]);
  expect(actions).toEqual([{ type: "push", screen: { name: "language-select" } }]);
});

test("EW4. 이미 같은 기록이면 저장도 저장 이벤트도 없이 언어 선택으로 간다", () => {
  const { log, wiring } = harness(emma);

  wiring.onContinueLearnerCountry(emma);

  expect(log).toEqual(["event:entry_screen_viewed:language-select", "dispatch:push"]);
});

test("EW5. 다른 기록으로 고치면 updated로 저장한다", () => {
  const { log, wiring } = harness(emma);

  wiring.onContinueLearnerCountry({ name: "Emma", countryCode: "FR" });

  expect(log.slice(0, 2)).toEqual(["save:Emma:FR", "event:learner_profile_saved:signup:updated"]);
});

test("EW6. ① · ② 의 뒤로는 진입 스택에서 한 칸 뒤다", () => {
  const { actions, wiring } = harness(null);

  wiring.onLearnerProfileStepBack();

  expect(actions).toEqual([{ type: "back" }]);
});
