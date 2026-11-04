import { expect, test } from "vitest";

import { episodeOpenGate, type EpisodeOpenGateInput } from "./episode-open-gate";
import type { NetworkProperties } from "./network-status";

// `unit` 계층: 에피소드를 열 때의 받기 판정(ADR-0095 D6 · D7)입니다.

const wifi: NetworkProperties = { network: "wifi", networkCost: "unmetered" };
const cellular: NetworkProperties = { network: "cellular", networkCost: "metered" };
const saver: NetworkProperties = { network: "cellular", networkCost: "constrained" };
const offline: NetworkProperties = { network: "offline", networkCost: "unknown" };
const unknown: NetworkProperties = { network: "unknown", networkCost: "unknown" };

const input = (over: Partial<EpisodeOpenGateInput>): EpisodeOpenGateInput => ({
  assetsComplete: false,
  isTutorial: false,
  network: cellular,
  policy: "ask",
  allowed: false,
  ...over,
});

test("OG1. 다 받은 편 · 튜토리얼은 연결과 상관없이 바로 연다", () => {
  for (const network of [wifi, cellular, saver, offline, unknown]) {
    expect(episodeOpenGate(input({ network, assetsComplete: true }))).toBe("open");
    expect(episodeOpenGate(input({ network, isTutorial: true }))).toBe("open");
  }
});

test("OG2. 덜 받은 편 — 오프라인이면 오프라인 시트다", () => {
  expect(episodeOpenGate(input({ network: offline }))).toBe("offline");
  expect(episodeOpenGate(input({ network: offline, policy: "always", allowed: true }))).toBe(
    "offline",
  );
});

test("OG3. 덜 받은 편 — 요금제 · 데이터 절약에서 ask면 묻고, wifi-only면 안내, always · 허락한 편은 연다", () => {
  for (const network of [cellular, saver]) {
    expect(episodeOpenGate(input({ network, policy: "ask" }))).toBe("ask");
    expect(episodeOpenGate(input({ network, policy: "wifi-only" }))).toBe("wifi-only");
    expect(episodeOpenGate(input({ network, policy: "always" }))).toBe("open");
    expect(episodeOpenGate(input({ network, allowed: true }))).toBe("open");
  }
});

test("OG4. 덜 받은 편 — 요금 없는 연결 · 모르는 연결은 연다(받는 중)", () => {
  expect(episodeOpenGate(input({ network: wifi }))).toBe("open");
  expect(episodeOpenGate(input({ network: unknown }))).toBe("open");
});
