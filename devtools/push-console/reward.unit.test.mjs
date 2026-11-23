import assert from "node:assert/strict";
import { test } from "node:test";

import {
  normalizeReward,
  REWARD_DEFAULTS,
  rewardLabel,
  rewardProblems,
  rewardRows,
  rewardTarget,
} from "./reward.mjs";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("PC-RW1. 양식 값 — 없음은 null, 엽전 · 티켓은 정수로, 빈칸은 처음 값", () => {
  assert.deepEqual(REWARD_DEFAULTS, { amount: 100, hours: 24, claimHours: 48 });
  assert.equal(normalizeReward(undefined), null);
  assert.equal(normalizeReward({ kind: "none", amount: 100 }), null);
  assert.deepEqual(normalizeReward({ kind: "coins", amount: "50", claimHours: "" }), {
    kind: "coins",
    amount: 50,
    claimHours: 48,
  });
  assert.deepEqual(normalizeReward({ kind: "unlimited_tickets" }), {
    kind: "unlimited_tickets",
    hours: 24,
    claimHours: 48,
  });
  assert.deepEqual(normalizeReward({ kind: "unlimited_tickets", hours: 12.5, claimHours: 72 }), {
    kind: "unlimited_tickets",
    hours: Number.NaN,
    claimHours: 72,
  });
  assert.equal(normalizeReward({ kind: "gems" }), null);
});

test("PC-RW2. 문제 — 엽전 1 ~ 1,000 · 티켓 1 ~ 168시간 · 기한 1 ~ 336시간", () => {
  assert.deepEqual(rewardProblems(null), []);
  assert.deepEqual(rewardProblems({ kind: "coins", amount: 100, claimHours: 48 }), []);
  assert.deepEqual(rewardProblems({ kind: "coins", amount: 0, claimHours: 48 }), [
    "엽전은 1 ~ 1,000 사이 정수로 적어 주세요.",
  ]);
  assert.deepEqual(rewardProblems({ kind: "unlimited_tickets", hours: 169, claimHours: 0 }), [
    "무제한 티켓 시간은 1 ~ 168 사이 정수로 적어 주세요.",
    "받을 기한은 1 ~ 336시간 사이 정수로 적어 주세요.",
  ]);
  assert.deepEqual(
    rewardProblems({ kind: "unlimited_tickets", hours: Number.NaN, claimHours: 48 }),
    ["무제한 티켓 시간은 1 ~ 168 사이 정수로 적어 주세요."],
  );
});

test("PC-RW3. 목적지 — 보상이 있을 때만 캠페인 id를 실은 여정 맵", () => {
  assert.equal(rewardTarget("c1", null), null);
  assert.deepEqual(rewardTarget("c1", { kind: "coins", amount: 100, claimHours: 48 }), {
    kind: "journey-map",
    campaignId: "c1",
  });
});

test("PC-RW4. 서버 기록 — 보상 한 줄과 보낸 그룹만의 수신자(대조군 없음), 기한은 발송 시각 + 시간", () => {
  const sentAtMs = Date.parse("2026-11-21T10:00:00Z");
  const rows = rewardRows({
    id: "c1",
    sentAtMs,
    reward: { kind: "unlimited_tickets", hours: 24, claimHours: 48 },
    recipients: [
      { userId: id(1), group: "sent" },
      { userId: id(2), group: "control" },
      { userId: id(3), group: "sent" },
    ],
  });
  assert.deepEqual(rows, {
    reward: {
      campaign_id: "c1",
      kind: "unlimited_tickets",
      amount: null,
      hours: 24,
      sent_at: "2026-11-21T10:00:00.000Z",
      claim_until: "2026-11-23T10:00:00.000Z",
    },
    recipients: [
      { campaign_id: "c1", user_id: id(1) },
      { campaign_id: "c1", user_id: id(3) },
    ],
  });
  assert.deepEqual(
    rewardRows({
      id: "c2",
      sentAtMs,
      reward: { kind: "coins", amount: 100, claimHours: 1 },
      recipients: [],
    }).reward,
    {
      campaign_id: "c2",
      kind: "coins",
      amount: 100,
      hours: null,
      sent_at: "2026-11-21T10:00:00.000Z",
      claim_until: "2026-11-21T11:00:00.000Z",
    },
  );
  assert.equal(rewardRows({ id: "c3", sentAtMs, reward: null, recipients: [] }), null);
});

test("PC-RW5. 한 줄 요약", () => {
  assert.equal(rewardLabel(null), "보상 없음");
  assert.equal(
    rewardLabel({ kind: "coins", amount: 100, claimHours: 48 }),
    "엽전 100 · 발송 뒤 48시간 안에 받기",
  );
  assert.equal(
    rewardLabel({ kind: "unlimited_tickets", hours: 24, claimHours: 48 }),
    "무제한 티켓 24시간 · 발송 뒤 48시간 안에 받기",
  );
});
