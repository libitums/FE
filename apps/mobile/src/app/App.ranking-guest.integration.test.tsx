import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import type { RankingClient } from "../lib/ranking.contract";
import { setRankingClientForTests } from "./ranking-wiring";
import {
  flushRounds,
  guestMarkerKey,
  installGuestHost,
  present,
  renderGuestApp,
  resetGuestHost,
  tapButtonIn,
} from "./test-helpers/guest-entry";

// `integration` 계층(ADR-0170 RK-I4): 비회원은 순위 서버를 부르지 않고 로그인 권유 — Sign in은 기존 로그인 화면(ADR-0111).

afterEach(() => {
  cleanup();
  setRankingClientForTests(null);
  resetGuestHost();
});

test("RK-I4. 비회원은 서버를 부르지 않고 로그인 권유 — Sign in은 기존 로그인 화면(guest-login)", async () => {
  const loads: string[] = [];
  const client: RankingClient = {
    load: async (kind) => {
      loads.push(kind);
      return { status: "error" };
    },
    preferences: async () => null,
    setHidden: async () => null,
  };
  setRankingClientForTests(client);
  const host = installGuestHost({
    store: new Map([
      [guestMarkerKey, "1"],
      [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    ]),
  });
  await renderGuestApp(host, { platform: "ios" });
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-ranking"), {});
  await flushRounds();
  expect(screen.getByTestId("ranking-notice")).toHaveAttribute("data-view", "guest");
  expect(loads).toEqual([]);
  tapButtonIn("ranking-notice-action");
  await flushRounds();
  expect(present("login-screen-title")).toBe(true);
  expect(present("login-screen-method-guest")).toBe(false);
});
