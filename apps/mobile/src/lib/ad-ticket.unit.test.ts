import { describe, expect, test } from "vitest";

import {
  adTicketArmFrom,
  adTicketHidden,
  adTicketPollDelayMs,
  adTicketRetryMs,
  adTicketStep,
  isRewardedUnitId,
  utcOffsetMinutes,
} from "./ad-ticket";
import type { AdTicketServerStatus, AdTicketState } from "./ad-ticket.contract";

// 광고 보고 티켓 1장(ADR-0209) — 시안 A1 ~ A5 상태 기계 · 확인 간격 · 실험군.
const status = (over: Partial<AdTicketServerStatus> = {}): AdTicketServerStatus => ({
  enabled: true,
  eligible: true,
  cap: 2,
  left: 2,
  request: null,
  unitId: "ca-app-pub-3940256099942544/1712485313",
  ...over,
});
const offer: AdTicketState = { kind: "offer", left: 2, cap: 2, failed: false };
const busy = (
  step: "starting" | "loading" | "showing" | "confirming",
  polls = 0,
): AdTicketState => ({
  kind: "busy",
  step,
  left: 2,
  cap: 2,
  requestId: step === "starting" ? null : "req-1",
  polls,
});

describe("AT-U1 서버 상태 → 첫 화면", () => {
  test("켜짐 · 대상 · 남음이면 A1 offer", () => {
    expect(adTicketStep(adTicketHidden, { type: "status", status: status() })).toEqual({
      state: offer,
      event: null,
      grant: false,
    });
  });
  test("오늘 다 썼으면 A4 limit", () => {
    expect(
      adTicketStep(adTicketHidden, { type: "status", status: status({ left: 0 }) }).state,
    ).toEqual({ kind: "limit", cap: 2 });
  });
  test("스위치 off · 대상 아님 · 읽지 못함 · 광고 단위 없음 · 단위 꼴이 틀리면 그리지 않는다", () => {
    for (const s of [
      status({ enabled: false }),
      status({ eligible: false }),
      null,
      status({ unitId: null }),
      status({ unitId: "ca-app-pub-1~2" }),
    ]) {
      expect(adTicketStep(offer, { type: "status", status: s }).state).toEqual(adTicketHidden);
    }
  });
  test("진행 중(busy)에는 상태 읽기가 화면을 바꾸지 않는다", () => {
    expect(
      adTicketStep(busy("loading"), { type: "status", status: status({ left: 0 }) }).state,
    ).toEqual(busy("loading"));
  });
});

describe("AT-U2 누름 → 시작 → 불러오기(A2)", () => {
  test("offer에서 누르면 busy starting, 다른 상태에서는 무시", () => {
    expect(adTicketStep(offer, { type: "tap" }).state).toEqual(busy("starting"));
    expect(adTicketStep({ ...offer, failed: true }, { type: "tap" }).state).toEqual(
      busy("starting"),
    );
    const limit: AdTicketState = { kind: "limit", cap: 2 };
    expect(adTicketStep(limit, { type: "tap" }).state).toBe(limit);
    expect(adTicketStep(busy("loading"), { type: "tap" }).state).toEqual(busy("loading"));
  });
  test("요청 id를 받으면 loading · ad_ticket_started", () => {
    const step = adTicketStep(busy("starting"), {
      type: "started",
      start: { result: "ok", requestId: "req-1", left: 2, cap: 2 },
    });
    expect(step.state).toEqual(busy("loading"));
    expect(step.event).toEqual({ name: "ad_ticket_started" });
  });
  test("시작 실패는 offer + 실패 안내, 상한은 A4, 막힘은 숨김", () => {
    expect(adTicketStep(busy("starting"), { type: "started", start: null })).toEqual({
      state: { ...offer, failed: true },
      event: { name: "ad_ticket_failed", reason: "start_failed" },
      grant: false,
    });
    expect(
      adTicketStep(busy("starting"), {
        type: "started",
        start: { result: "limit", left: 0, cap: 2 },
      }),
    ).toEqual({
      state: { kind: "limit", cap: 2 },
      event: { name: "ad_ticket_failed", reason: "limit" },
      grant: false,
    });
    expect(
      adTicketStep(busy("starting"), {
        type: "started",
        start: { result: "blocked", left: 2, cap: 2 },
      }).state,
    ).toEqual(adTicketHidden);
  });
});

describe("AT-U3 광고 결과", () => {
  test("불러오면 showing", () => {
    expect(
      adTicketStep(busy("loading"), { type: "loaded", load: "loaded", nowMs: 0 }).state,
    ).toEqual(busy("showing"));
  });
  test("광고 없음 · 8초 넘김은 A5 — 1분 뒤 다시, 횟수 그대로", () => {
    expect(
      adTicketStep(busy("loading"), { type: "loaded", load: "unavailable", nowMs: 1000 }),
    ).toEqual({
      state: { kind: "no-fill", left: 2, cap: 2, retryAtMs: 1000 + adTicketRetryMs },
      event: { name: "ad_ticket_failed", reason: "no_fill" },
      grant: false,
    });
    expect(
      adTicketStep(busy("loading"), { type: "loaded", load: "timeout", nowMs: 0 }).event,
    ).toEqual({ name: "ad_ticket_failed", reason: "load_timeout" });
    expect(
      adTicketStep({ kind: "no-fill", left: 2, cap: 2, retryAtMs: 5 }, { type: "retry" }).state,
    ).toEqual(offer);
  });
  test("끝까지 봤으면 confirming · ad_ticket_completed", () => {
    const step = adTicketStep(busy("showing"), { type: "shown", show: "earned" });
    expect(step.state).toEqual(busy("confirming"));
    expect(step.event).toEqual({ name: "ad_ticket_completed" });
  });
  test("일찍 닫으면 offer(안내 없음) · 띄우지 못하면 offer + 실패 안내", () => {
    expect(adTicketStep(busy("showing"), { type: "shown", show: "dismissed" })).toEqual({
      state: offer,
      event: { name: "ad_ticket_failed", reason: "closed_early" },
      grant: false,
    });
    expect(adTicketStep(busy("showing"), { type: "shown", show: "failed" }).state).toEqual({
      ...offer,
      failed: true,
    });
  });
  test("늦게 온 결과(다른 단계)는 무시한다", () => {
    expect(adTicketStep(offer, { type: "shown", show: "earned" }).state).toBe(offer);
    expect(
      adTicketStep(busy("showing"), { type: "loaded", load: "loaded", nowMs: 0 }).state,
    ).toEqual(busy("showing"));
  });
});

describe("AT-U4 지급 확인(SSV가 늦으면 다시 읽음)", () => {
  const granted = status({ left: 1, request: { status: "granted", reason: null } });
  test("granted면 A3 · 원장에 1장 · ad_ticket_granted(남은 횟수)", () => {
    expect(adTicketStep(busy("confirming"), { type: "polled", status: granted })).toEqual({
      state: { kind: "granted", left: 1 },
      event: { name: "ad_ticket_granted", left: "1" },
      grant: true,
    });
  });
  test("아직 pending · 읽기 실패면 polls만 늘고, 간격이 다하면 실패 안내", () => {
    const pending = status({ request: { status: "pending", reason: null } });
    expect(adTicketStep(busy("confirming"), { type: "polled", status: pending }).state).toEqual(
      busy("confirming", 1),
    );
    expect(adTicketStep(busy("confirming", 2), { type: "polled", status: null }).state).toEqual(
      busy("confirming", 3),
    );
    let polls = 0;
    while (adTicketPollDelayMs(polls + 1) !== null) polls += 1;
    expect(adTicketStep(busy("confirming", polls), { type: "polled", status: pending })).toEqual({
      state: { ...offer, failed: true },
      event: { name: "ad_ticket_failed", reason: "confirm_timeout" },
      grant: false,
    });
  });
  test("상한으로 거절되면 A4, 그 밖의 거절은 숨김 — 지급하지 않는다", () => {
    expect(
      adTicketStep(busy("confirming"), {
        type: "polled",
        status: status({ left: 0, request: { status: "rejected", reason: "limit" } }),
      }),
    ).toEqual({
      state: { kind: "limit", cap: 2 },
      event: { name: "ad_ticket_failed", reason: "limit" },
      grant: false,
    });
    const other = adTicketStep(busy("confirming"), {
      type: "polled",
      status: status({ request: { status: "rejected", reason: "subscribed" } }),
    });
    expect(other).toEqual({
      state: adTicketHidden,
      event: { name: "ad_ticket_failed", reason: "rejected" },
      grant: false,
    });
  });
});

describe("AT-U5 확인 간격 · 실험군 · 오프셋", () => {
  test("간격은 늘어나다 끝난다(합 30초 안)", () => {
    const delays: number[] = [];
    for (let i = 0; adTicketPollDelayMs(i) !== null; i += 1) delays.push(adTicketPollDelayMs(i)!);
    expect(delays.length).toBeGreaterThanOrEqual(5);
    expect(delays.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(30_000);
    expect(delays[0]).toBeLessThanOrEqual(delays[delays.length - 1]!);
  });
  test("PostHog /flags 응답: 켜짐이고 변형 없음 · test면 test, 그 밖은 control", () => {
    const body = (flag: unknown) => JSON.stringify({ flags: { "ad-ticket": flag } });
    expect(adTicketArmFrom(body({ enabled: true, variant: null }), "ad-ticket")).toBe("test");
    expect(adTicketArmFrom(body({ enabled: true, variant: "test" }), "ad-ticket")).toBe("test");
    expect(adTicketArmFrom(body({ enabled: true, variant: "control" }), "ad-ticket")).toBe(
      "control",
    );
    expect(adTicketArmFrom(body({ enabled: false }), "ad-ticket")).toBe("control");
    expect(adTicketArmFrom(JSON.stringify({ flags: {} }), "ad-ticket")).toBe("control");
    expect(adTicketArmFrom("nope", "ad-ticket")).toBe("control");
    expect(adTicketArmFrom(null, "ad-ticket")).toBe("control");
  });
  test("UTC 오프셋(분)은 getTimezoneOffset의 부호를 뒤집는다", () => {
    expect(utcOffsetMinutes({ getTimezoneOffset: () => -420 } as Date)).toBe(420);
    expect(utcOffsetMinutes({ getTimezoneOffset: () => 300 } as Date)).toBe(-300);
    expect(utcOffsetMinutes({ getTimezoneOffset: () => 0 } as Date)).toBe(0);
  });
});

describe("AT-U6 광고 단위 ID 꼴(ADR-0209 D10)", () => {
  test("ca-app-pub-숫자/숫자만 받는다", () => {
    expect(isRewardedUnitId("ca-app-pub-3940256099942544/1712485313")).toBe(true);
    expect(isRewardedUnitId("ca-app-pub-3940256099942544~1458002511")).toBe(false);
    expect(isRewardedUnitId(" ca-app-pub-1/2")).toBe(false);
    expect(isRewardedUnitId("")).toBe(false);
    expect(isRewardedUnitId(null)).toBe(false);
  });
});
