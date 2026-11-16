import assert from "node:assert/strict";
import { test } from "node:test";

import { autoCampaignsFrom } from "./auto.mjs";

test("PC-AU1 자동 배정 기록 → 회차 × 세그먼트마다 캠페인, 대조군은 변형 없음, 시간대는 붙여 줌", () => {
  const row = (
    user,
    group,
    variant,
    segment = "episode-mid",
    runAt = "2026-11-17T12:05:00.000Z",
  ) => ({
    run_at: runAt,
    series: `자동 · ${segment}`,
    segment,
    user_id: user,
    group,
    variant,
    lang: "en",
    story_step: variant === "b" ? "u01-water:S1:dare" : null,
  });
  const campaigns = autoCampaignsFrom(
    [
      row("u1", "sent", "a"),
      row("u2", "sent", "b"),
      row("u3", "control", null),
      row("u4", "sent", "a", "tutorial-lesson2"),
      row("u5", "sent", "a", "episode-mid", "2026-11-17T13:05:00.000Z"),
      { ...row("u6", "sent", "a"), run_at: "broken" },
    ],
    (user) => (user === "u1" ? "Asia/Manila" : null),
  );
  assert.equal(campaigns.length, 3);
  const mid = campaigns.find((c) => c.id === "auto-202611171205-episode-mid");
  assert.equal(mid.series, "자동 · episode-mid");
  assert.deepEqual(
    mid.recipients.map((r) => [r.userId, r.group, r.variant, r.timeZone]),
    [
      ["u1", "sent", "a", "Asia/Manila"],
      ["u2", "sent", "b", null],
      ["u3", "control", null, null],
    ],
  );
  assert.deepEqual(
    mid.variants.map((v) => v.id),
    ["a", "b"],
  );
});
