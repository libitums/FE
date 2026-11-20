import { describe, expect, test } from "vitest";

import {
  mediaListFrom,
  mediaRequestFrom,
  remoteMediaOf,
  signedUrlFrom,
  walletBalanceFrom,
  walletOf,
} from "./companion-media-parse";

// `unit` 계층(CM-U1 ~ U3): 사진 · 음성 서버 JSON 해석 · 오류 표(ADR-0146 「앱 연결」).

const M1 = "33333333-3333-4333-8333-333333333333";
const A0 = "00000000-0000-4000-8000-000000000000";
const NOW = Date.parse("2026-11-15T10:20:00.000Z");

const row = (over: Record<string, unknown> = {}) => ({
  id: M1,
  characterId: "duksu",
  messageId: A0,
  kind: "snapshot",
  status: "pending",
  charge: "photo",
  cost: 35,
  path: null,
  mime: null,
  aspect: null,
  failure: null,
  aiGenerated: true,
  engine: null,
  model: null,
  createdAt: "2026-11-15T10:19:00.000Z",
  finishedAt: null,
  ...over,
});

describe("결과 한 건 · 목록", () => {
  test("CM-U1a 상태 넷과 칸을 앱 모양으로 푼다", () => {
    expect(remoteMediaOf(row())).toEqual({
      id: M1,
      messageId: A0,
      kind: "snapshot",
      status: "pending",
      path: null,
      aspect: null,
      failure: null,
      createdAt: Date.parse("2026-11-15T10:19:00.000Z"),
    });
    const done = remoteMediaOf(
      row({ status: "complete", path: `u/${M1}.png`, aspect: "3:2", kind: "snapshot" }),
    );
    expect(done).toMatchObject({ status: "complete", path: `u/${M1}.png`, aspect: "3:2" });
    expect(remoteMediaOf(row({ status: "blocked", failure: "check_failed" }))?.failure).toBe(
      "check_failed",
    );
    expect(
      remoteMediaOf(row({ kind: "voice", status: "failed", failure: "expired" })),
    ).toMatchObject({ kind: "voice", status: "failed", failure: "expired" });
  });

  test("CM-U1b 모르는 상태 · 종류 · 빠진 id는 null, 모르는 비율은 null로", () => {
    expect(remoteMediaOf(row({ status: "weird" }))).toBeNull();
    expect(remoteMediaOf(row({ kind: "video" }))).toBeNull();
    expect(remoteMediaOf(row({ id: 3 }))).toBeNull();
    expect(remoteMediaOf(row({ messageId: null }))).toBeNull();
    expect(remoteMediaOf(null)).toBeNull();
    expect(remoteMediaOf(row({ aspect: "16:9" }))?.aspect).toBeNull();
  });

  test("CM-U1c 목록은 배열만 — 틀린 줄은 버리고, 깨진 본문 · 배열 아님은 null", () => {
    expect(mediaListFrom(JSON.stringify([row(), { nope: true }]))).toHaveLength(1);
    expect(mediaListFrom("[]")).toEqual([]);
    expect(mediaListFrom("{")).toBeNull();
    expect(mediaListFrom(JSON.stringify({ items: [] }))).toBeNull();
    expect(mediaListFrom(null)).toBeNull();
  });
});

describe("요청 응답 · 오류 표", () => {
  const error = (status: number, code: string, detail?: Record<string, unknown>) =>
    mediaRequestFrom(
      status,
      JSON.stringify(detail === undefined ? { error: code } : { error: code, detail }),
      NOW,
    );

  test("CM-U2a 202는 새로 만듦(cached false), 200 cached는 저장본", () => {
    expect(mediaRequestFrom(202, JSON.stringify({ media: row(), cached: false }), NOW)).toEqual({
      kind: "accepted",
      media: remoteMediaOf(row()),
      cached: false,
    });
    const cached = mediaRequestFrom(
      200,
      JSON.stringify({ media: row({ status: "complete", path: "u/p.png" }), cached: true }),
      NOW,
    );
    expect(cached).toMatchObject({ kind: "accepted", cached: true });
  });

  test("CM-U2b 오류 코드마다 안내 줄 까닭", () => {
    expect(error(402, "insufficient_credits", { required: 35, balance: 3 })).toEqual({
      kind: "refused",
      notice: "no-coins",
      until: null,
    });
    expect(error(409, "snapshot_in_progress", { mediaId: M1 })).toMatchObject({ notice: "busy" });
    expect(
      error(429, "attempt_limit", {
        kind: "snapshot",
        reason: "attempts",
        limit: 30,
        resetsAt: "2026-11-16T00:00:00.000Z",
      }),
    ).toEqual({ kind: "refused", notice: "limit", until: Date.parse("2026-11-16T00:00:00.000Z") });
    // 하루 상한은 시각이 없어 다음 UTC 자정.
    expect(error(429, "daily_limit", { limit: 5 })).toEqual({
      kind: "refused",
      notice: "limit",
      until: Date.parse("2026-11-16T00:00:00.000Z"),
    });
    for (const [status, code] of [
      [422, "not_eligible"],
      [422, "no_speech"],
      [422, "too_long"],
      [404, "message_not_found"],
      [403, "forbidden"],
    ] as const)
      expect(error(status, code)).toMatchObject({ notice: "not-eligible" });
    for (const [status, code] of [
      [403, "not_available"],
      [403, "age_restricted"],
      [403, "temporarily_blocked"],
      [403, "usage_time_limit"],
      [503, "not_configured"],
      [400, "invalid_request"],
      [401, "invalid_session"],
      [405, "method_not_allowed"],
    ] as const)
      expect(error(status, code)).toMatchObject({ notice: "unavailable" });
  });

  test("CM-U2c 5xx · 깨진 본문 · 성공인데 모양이 틀림은 failed(받았는지 모름)", () => {
    expect(error(500, "internal_error")).toEqual({ kind: "failed" });
    expect(mediaRequestFrom(502, "<html>", NOW)).toEqual({ kind: "failed" });
    expect(mediaRequestFrom(202, "{", NOW)).toEqual({ kind: "failed" });
    expect(mediaRequestFrom(202, JSON.stringify({ media: { id: 1 } }), NOW)).toEqual({
      kind: "failed",
    });
    expect(mediaRequestFrom(429, JSON.stringify({ error: "attempt_limit" }), NOW)).toEqual({
      kind: "refused",
      notice: "limit",
      until: Date.parse("2026-11-16T00:00:00.000Z"),
    });
  });
});

describe("서명 URL · 지갑", () => {
  test("CM-U3a 서명 경로를 Storage 주소에 잇는다", () => {
    const base = "https://p.supabase.co/storage/v1";
    expect(
      signedUrlFrom(
        JSON.stringify({ signedURL: "/object/sign/companion-media/u/a.png?token=t" }),
        base,
      ),
    ).toBe(`${base}/object/sign/companion-media/u/a.png?token=t`);
    expect(signedUrlFrom(JSON.stringify({}), base)).toBeNull();
    expect(signedUrlFrom("{", base)).toBeNull();
    expect(signedUrlFrom(null, base)).toBeNull();
  });

  test("CM-U3b 지갑 잔액 = sub + grant + paid, 틀리면 null", () => {
    expect(walletBalanceFrom(JSON.stringify({ sub: 10, grant: 5, paid: 100, tier: "free" }))).toBe(
      115,
    );
    expect(walletBalanceFrom(JSON.stringify({ sub: 0, grant: 0, paid: 0 }))).toBe(0);
    expect(walletBalanceFrom(JSON.stringify({ sub: -1, grant: 0, paid: 0 }))).toBeNull();
    expect(walletBalanceFrom(JSON.stringify({ grant: 0 }))).toBeNull();
    expect(walletBalanceFrom("x")).toBeNull();
  });
});

// CP-U6(ADR-0155): `companion_get_wallet` — 잔액(sub + grant + paid)과 체험 남은 수(`trialRemaining`).
describe("walletOf (CP-U6)", () => {
  test("CP-U6 잔액 · 체험 남은 수를 함께 읽고, 체험 칸이 없거나 틀리면 체험만 null", () => {
    expect(walletOf(JSON.stringify({ sub: 0, grant: 5, paid: 10, trialRemaining: 17 }))).toEqual({
      balance: 15,
      trialRemaining: 17,
    });
    expect(walletOf(JSON.stringify({ sub: 0, grant: 5, paid: 10 }))).toEqual({
      balance: 15,
      trialRemaining: null,
    });
    expect(walletOf(JSON.stringify({ sub: 0, grant: 5, paid: 10, trialRemaining: -1 }))).toEqual({
      balance: 15,
      trialRemaining: null,
    });
  });

  test("CP-U6 잔액 칸이 틀리면 지갑 전체가 null", () => {
    expect(walletOf(JSON.stringify({ grant: 5, paid: 10, trialRemaining: 3 }))).toBeNull();
    expect(walletOf(null)).toBeNull();
    expect(walletOf("not json")).toBeNull();
  });
});
