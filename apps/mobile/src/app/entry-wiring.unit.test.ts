import { expect, test } from "vitest";

import { entryWiring } from "./entry-wiring";
import type { EntryWiringArgs } from "./entry-wiring";
import type { LearnerProfileRecord } from "../lib/learner-profile.contract";

// 3d-2 리뷰 P2-1: 온보딩 넷째 스텝에서 저장한 값을 되돌아와 비우고 건너뛰면 손님 칸도 지웁니다.

const emma: LearnerProfileRecord = { name: "Emma", countryCode: "DE" };

function harness(learnerRecord: LearnerProfileRecord | null) {
  const log: string[] = [];
  const args: EntryWiringArgs = {
    entryEventSink: (event) => void log.push(`event:${event.name}`),
    analyticsUser: null,
    dispatch: (action) => void log.push(`dispatch:${action.type}`),
    entryLanguage: "en",
    setEntryLanguage: () => undefined,
    syncProgress: async () => undefined,
    learnerRecord,
    saveLearnerProfile: () => void log.push("save"),
    markLearnerProfileAsked: () => void log.push("asked"),
    clearGuestLearnerProfile: () => void log.push("clear-guest"),
    syncLearnerProfile: async () => undefined,
  };
  return { log, wiring: entryWiring(args) };
}

test("EW1. 담아 둔 값이 있는 채 건너뛰면 손님 칸을 지우고 건너뜀 이벤트를 낸다", () => {
  const { log, wiring } = harness(emma);

  wiring.onOnboardingComplete({ kind: "skipped" });

  expect(log).toContain("clear-guest");
  expect(log).toContain("asked");
  expect(log).toContain("event:learner_profile_skipped");
  expect(log).not.toContain("save");
});

test("EW2. 저장으로 끝나면 손님 칸을 지우지 않는다", () => {
  const { log, wiring } = harness(null);

  wiring.onOnboardingComplete({ kind: "saved", record: emma });

  expect(log).toContain("save");
  expect(log).not.toContain("clear-guest");
});
