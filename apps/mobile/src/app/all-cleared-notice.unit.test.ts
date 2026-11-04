import { expect, test } from "vitest";

import { allClearedNoticeStep, type AllClearedNoticeInput } from "./all-cleared-notice";

// `unit` 계층: 모두 끝낸 뒤 시트를 띄울 때(ADR-0095 D9).

const input = (over: Partial<AllClearedNoticeInput>): AllClearedNoticeInput => ({
  allCleared: true,
  atMapRoot: true,
  stale: true,
  offline: false,
  ...over,
});

test("ACN1. 앱을 켤 때 이미 다 끝낸 상태면 띄우지 않는다", () => {
  const start = { previousCleared: true, pending: false };
  expect(allClearedNoticeStep(start, input({})).show).toBe(false);
});

test("ACN2. 끝낸 순간 맵 루트이고 오래 확인 못 했거나 오프라인이면 한 번 띄운다", () => {
  const before = { previousCleared: false, pending: false };
  const stale = allClearedNoticeStep(before, input({ stale: true }));
  expect(stale.show).toBe(true);
  expect(allClearedNoticeStep(stale.state, input({})).show).toBe(false);
  expect(allClearedNoticeStep(before, input({ stale: false, offline: true })).show).toBe(true);
});

test("ACN3. 끝낸 순간 맵 루트가 아니면 기억했다가 맵 루트에 설 때 판정한다", () => {
  const first = allClearedNoticeStep(
    { previousCleared: false, pending: false },
    input({ atMapRoot: false }),
  );
  expect(first.show).toBe(false);
  expect(first.state.pending).toBe(true);
  expect(allClearedNoticeStep(first.state, input({ atMapRoot: true })).show).toBe(true);
});

test("ACN4. 끝낸 순간이어도 최근에 확인했고 연결돼 있으면 띄우지 않고 기억도 지운다", () => {
  const step = allClearedNoticeStep(
    { previousCleared: false, pending: false },
    input({ stale: false, offline: false }),
  );
  expect(step.show).toBe(false);
  expect(step.state.pending).toBe(false);
});
