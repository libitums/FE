import { describe, expect, test } from "vitest";

import { launchRecordFrom, launchStep, tutorialDone, type LaunchRecord } from "./launch-coins";

// `unit` 계층(YL-U3 ~ U5): 엽전 출시 안내 순서 · 새 사용자 미룸 · 기록 읽기(ADR-0140).

const record = (over: Partial<LaunchRecord> = {}): LaunchRecord => ({
  learning: 370,
  bonus: 100,
  coinsShown: false,
  chatShown: false,
  ...over,
});

describe("순서", () => {
  test("YL-U3 엽전 먼저, 그 뒤 메신저를 쓸 수 있으면 채팅, 둘 다 봤으면 없음", () => {
    expect(launchStep({ record: record(), chatOpen: true, idle: true })).toBe("coins");
    expect(launchStep({ record: record({ coinsShown: true }), chatOpen: true, idle: true })).toBe(
      "chat",
    );
    expect(
      launchStep({ record: record({ coinsShown: true }), chatOpen: false, idle: true }),
    ).toBeNull();
    expect(
      launchStep({
        record: record({ coinsShown: true, chatShown: true }),
        chatOpen: true,
        idle: true,
      }),
    ).toBeNull();
  });

  test("YL-U3 지도가 한가하지 않거나 지급 기록이 없으면 띄우지 않는다", () => {
    expect(launchStep({ record: record(), chatOpen: true, idle: false })).toBeNull();
    expect(launchStep({ record: null, chatOpen: true, idle: true })).toBeNull();
  });

  test("YL-U4 새 사용자는 튜토리얼 최종(u00 RP)을 끝낸 뒤 — 옛 튜토리얼 통과 기록도 끝낸 것", () => {
    expect(tutorialDone({}, false)).toBe(false);
    expect(tutorialDone({ "u00-tutorial": ["intro", "S1", "S2", "S3"] }, false)).toBe(false);
    expect(tutorialDone({ "u00-tutorial": ["S1", "RP"] }, false)).toBe(true);
    expect(tutorialDone({}, true)).toBe(true);
  });
});

test("YL-U5 기록 읽기 — 틀리면 null, 본 표시는 참일 때만", () => {
  expect(launchRecordFrom(JSON.stringify({ learning: 0, bonus: 100, coinsShown: true }))).toEqual(
    record({ learning: 0, coinsShown: true }),
  );
  expect(launchRecordFrom(JSON.stringify({ learning: "1", bonus: 0 }))).toBeNull();
  expect(launchRecordFrom("x")).toBeNull();
  expect(launchRecordFrom(null)).toBeNull();
});
