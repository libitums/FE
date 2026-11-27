import { expect, test } from "vitest";

import { lastMessagesFrom } from "./companion-activity-parse";

// `unit` 계층(LS-U1 · U2): 목록 요약(`companion_list_characters`) → 인물 id → 서버 lastMessageAt.

test("LS-U1 인물마다 lastMessageAt(대화가 없으면 null)을 읽는다 — 다른 칸은 보지 않는다", () => {
  const body = JSON.stringify([
    {
      id: "duksu",
      available: true,
      lastMessageAt: "2026-11-27T10:31:08.260Z",
      speechLevel: "polite",
    },
    { id: "mina", available: false, unavailableReason: "trial_exhausted", lastMessageAt: null },
    { id: "doyun" },
  ]);
  expect([...(lastMessagesFrom(body) ?? new Map()).entries()]).toEqual([
    ["duksu", "2026-11-27T10:31:08.260Z"],
    ["mina", null],
    ["doyun", null],
  ]);
});

test("LS-U2 응답이 없거나 틀리면 null — 틀린 줄만 있으면 그 줄을 건너뛴다", () => {
  expect(lastMessagesFrom(null)).toBeNull();
  expect(lastMessagesFrom("not json")).toBeNull();
  expect(lastMessagesFrom(JSON.stringify({ id: "duksu" }))).toBeNull();
  const skipped = lastMessagesFrom(
    JSON.stringify([{ id: 3 }, null, { id: "mina", lastMessageAt: 7 }]),
  );
  expect([...(skipped ?? new Map()).entries()]).toEqual([["mina", null]]);
});
