import { describe, expect, test } from "vitest";

import { turnOutcomeOf } from "./companion-outcome";
import { applyTurnEvent, initialTurnState, type TurnState } from "./companion-turn";

// `unit` 계층(ES-U1 ~ U6 · U11): 턴이 끝난 모양 → 방이 할 일(ADR-0138).

const NOW = Date.parse("2026-11-13T10:00:00.000Z");
const started: TurnState = applyTurnEvent(
  initialTurnState,
  "start",
  JSON.stringify({ userMessageId: "u", assistantMessageId: "a" }),
);
const http = (error: string, detail?: unknown) =>
  turnOutcomeOf(initialTurnState, "http-error", JSON.stringify({ error, detail }), NOW);

describe("끊김", () => {
  test("ES-U1 done이면 ok", () => {
    const done = applyTurnEvent(started, "done", JSON.stringify({ assistantMessageId: "a" }));
    expect(turnOutcomeOf(done, "complete", null, NOW)).toEqual({ kind: "ok" });
  });

  test("ES-U2 start 전 끊김 · 연결 실패 · 시간 초과 · 취소는 보내지 못함(줄 없음) — 받았는지 기록으로 확인", () => {
    for (const reason of ["network", "timeout-connect", "timeout-idle", "unavailable", "cancelled"])
      expect(turnOutcomeOf(initialTurnState, reason, null, NOW)).toEqual({
        kind: "unsent",
        notice: null,
        check: true,
      });
  });

  test("ES-U3 start 뒤 끊김은 기록에서 채운다", () => {
    for (const reason of ["network", "timeout-idle", "unavailable", "complete"])
      expect(turnOutcomeOf(started, reason, null, NOW)).toEqual({ kind: "recover" });
  });
});

describe("서버 오류 코드", () => {
  test("ES-U4 받은 뒤 SSE error — 답 실패 · 안전 규칙", () => {
    const failed = (code: string) =>
      turnOutcomeOf(
        applyTurnEvent(started, "error", JSON.stringify({ code })),
        "complete",
        null,
        NOW,
      );
    expect(failed("internal_error")).toEqual({ kind: "notice", notice: "reply-failed" });
    expect(failed("upstream_unavailable")).toEqual({ kind: "notice", notice: "reply-failed" });
    expect(failed("guardrail_blocked")).toEqual({ kind: "notice", notice: "cant-reply" });
    expect(failed("brand_new")).toEqual({ kind: "notice", notice: "reply-failed" });
  });

  test("ES-U5 사전 오류 코드 표", () => {
    expect(http("internal_error")).toEqual({ kind: "unsent", notice: null, check: false });
    expect(http("rate_limited")).toEqual({ kind: "unsent", notice: "rate-limited", check: false });
    expect(http("invalid_session")).toEqual({ kind: "unsent", notice: "signed-out", check: false });
    expect(http("unsupported_contract_version")).toEqual({
      kind: "unsent",
      notice: "update-required",
      check: false,
    });
    // 받았는지 모름 — 같은 client_message_id가 이미 있거나 그 턴이 아직 돎(리뷰 W4).
    expect(http("turn_in_progress")).toEqual({ kind: "unsent", notice: null, check: true });
    expect(http("duplicate_message")).toEqual({ kind: "unsent", notice: null, check: true });
    expect(http("not_latest_message")).toEqual({ kind: "unsent", notice: null, check: true });
    expect(http("insufficient_credits")).toEqual({ kind: "notice", notice: "no-credits" });
    expect(http("trial_exhausted")).toEqual({ kind: "notice", notice: "no-credits" });
    expect(http("not_available")).toEqual({ kind: "notice", notice: "not-available" });
    for (const code of [
      "character_not_found",
      "invalid_request",
      "method_not_allowed",
      "server_misconfigured",
    ])
      expect(http(code)).toEqual({ kind: "notice", notice: "server-error" });
  });

  test("ES-U6 입력 막힘 셋 · 모르는 본문", () => {
    expect(http("temporarily_blocked", { until: "2026-11-13T10:30:00.000Z" })).toEqual({
      kind: "block",
      block: { kind: "temporarily-blocked", until: Date.parse("2026-11-13T10:30:00.000Z") },
    });
    expect(http("usage_time_limit", { resetsAt: "2026-11-14T00:00:00.000Z" })).toEqual({
      kind: "block",
      block: { kind: "usage-time-limit", resetsAt: Date.parse("2026-11-14T00:00:00.000Z") },
    });
    expect(http("age_restricted")).toEqual({ kind: "block", block: { kind: "age-restricted" } });
    expect(http("never_heard")).toEqual({ kind: "notice", notice: "server-error" });
    expect(turnOutcomeOf(initialTurnState, "http-error", "<html>", NOW)).toEqual({
      kind: "unsent",
      notice: null,
      check: true,
    });
  });

  test("ES-U11 SSE error는 코드를 싣고 턴을 닫는다", () => {
    const failed = applyTurnEvent(started, "error", JSON.stringify({ code: "guardrail_blocked" }));
    expect(failed.finished).toBe(true);
    expect(failed.failure).toEqual({ kind: "stream-error", code: "guardrail_blocked" });
  });
});
