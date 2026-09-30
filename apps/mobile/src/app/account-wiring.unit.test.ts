import { expect, test } from "vitest";

import { analyticsResetScopeFor } from "./account-wiring";

// test-plan §2.6 AW3 — 결선의 순수 부분(reset 범위).

test("AW3: signed-out → identity, deleted → identity-and-queue", () => {
  expect(analyticsResetScopeFor("signed-out")).toBe("identity");
  expect(analyticsResetScopeFor("deleted")).toBe("identity-and-queue");
});
