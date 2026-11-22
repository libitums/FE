import { describe, expect, test } from "vitest";

import type { RemoteMedia } from "./chat-media.contract";
import {
  MEDIA_POLL_LIMIT_MS,
  mediaAvailabilityOf,
  mediaLineId,
  mediaLineKey,
  mediaLineOf,
  mediaPollDelay,
  mediaTargetOf,
  nextUtcMidnight,
  placeMediaLine,
} from "./chat-media-rules";
import type { ChatMessage } from "./chat-source.contract";

// `unit` 계층(CM-U4 ~ U7): 대상 메시지 · 알약 상태 · 로그 줄 · 다시 읽기 간격(ADR-0146 「앱 연결」).

const A0 = "00000000-0000-4000-8000-000000000000";
const A1 = "22222222-2222-4222-8222-222222222222";
const U1 = "11111111-1111-4111-8111-111111111111";
const M1 = "33333333-3333-4333-8333-333333333333";
const M2 = "44444444-4444-4444-8444-444444444444";

const say = (id: string, ko: string, en: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko, en },
});
const act = (id: string, ko: string): ChatMessage => ({
  id,
  at: 1,
  kind: "action",
  text: { ko, en: "" },
});
const mine = (id: string): ChatMessage => ({
  id,
  at: 2,
  kind: "text",
  from: "me",
  text: { ko: "네", en: "" },
});

const log: ChatMessage[] = [
  say(`${A0}#0`, "안녕", "Hi"),
  mine(U1),
  act(`${A1}#0`, "*웃는다*"),
  say(`${A1}#1`, "반가워요", "Nice to meet you"),
  say(`${A1}#2`, "잘 지냈어요?", "How are you?"),
];

const media = (over: Partial<RemoteMedia> = {}): RemoteMedia => ({
  id: M1,
  messageId: A1,
  kind: "snapshot",
  status: "pending",
  path: null,
  aspect: null,
  failure: null,
  createdAt: 5,
  ...over,
});

describe("대상 메시지", () => {
  test("CM-U4a 가장 최근 캐릭터 메시지(말풍선 여럿) — 말만 이어 붙인 텍스트", () => {
    expect(mediaTargetOf(log, "photo")).toEqual({
      messageId: A1,
      text: { ko: "반가워요 잘 지냈어요?", en: "Nice to meet you How are you?" },
    });
    expect(mediaTargetOf(log, "voice")?.messageId).toBe(A1);
  });

  test("CM-U4b 내 글이 뒤에 있어도 마지막 캐릭터 메시지가 대상", () => {
    expect(mediaTargetOf([...log, mine("local-1")], "photo")?.messageId).toBe(A1);
  });

  test("CM-U4c 서버 id가 없는 줄(가짜 출처 · 인사 회색 줄)은 대상이 아니다", () => {
    expect(mediaTargetOf([say("fx-1", "안녕", "Hi")], "photo")).toBeNull();
    expect(mediaTargetOf([], "photo")).toBeNull();
    expect(mediaTargetOf([mine(U1)], "voice")).toBeNull();
  });

  test("CM-U4d 음성은 말 조각이 있어야 — 지문만인 메시지면 null(사진은 된다)", () => {
    const actionOnly = [say(`${A0}#0`, "안녕", "Hi"), act(`${A1}#0`, "*손을 흔든다*")];
    expect(mediaTargetOf(actionOnly, "voice")).toBeNull();
    expect(mediaTargetOf(actionOnly, "photo")?.messageId).toBe(A1);
  });

  test("CM-U4e 줄 id는 대상 · 종류 · 꼬리를 담고 되읽힌다", () => {
    const id = mediaLineId(A1, "voice", M1);
    expect(id).toBe(`${A1}~voice~${M1}`);
    expect(mediaLineKey(id)).toEqual({ targetId: A1, media: "voice", suffix: M1 });
    expect(mediaLineKey(mediaLineId(A1, "photo", "req"))).toEqual({
      targetId: A1,
      media: "photo",
      suffix: "req",
    });
    expect(mediaLineKey(`${A1}#0`)).toBeNull();
    expect(mediaLineKey(`${U1}~n0`)).toBeNull();
  });
});

describe("알약 상태", () => {
  const room = (messages: readonly ChatMessage[], busy = false, server = true) => ({
    messages,
    busy,
    server,
  });
  const pendingPhoto = (target: string): ChatMessage => ({
    id: mediaLineId(target, "photo", M1),
    at: 3,
    kind: "photo-pending",
  });

  test("CM-U5a 가짜 출처는 늘 ready, 서버 방은 답을 기다리면 · 대상이 없으면 wait", () => {
    expect(mediaAvailabilityOf(room([], false, false), "photo")).toBe("ready");
    expect(mediaAvailabilityOf(room(log), "photo")).toBe("ready");
    expect(mediaAvailabilityOf(room(log, true), "photo")).toBe("wait");
    expect(mediaAvailabilityOf(room([mine(U1)]), "voice")).toBe("wait");
  });

  test("CM-U5b 사진은 방 안 어디든 만드는 중이면 pending, 음성은 같은 대상만", () => {
    const older = [say(`${A0}#0`, "안녕", "Hi"), pendingPhoto(A0), ...log.slice(1)];
    expect(mediaAvailabilityOf(room(older), "photo")).toBe("pending");
    const voiceOld: ChatMessage = {
      id: mediaLineId(A0, "voice", M2),
      at: 3,
      kind: "voice-pending",
    };
    expect(
      mediaAvailabilityOf(room([log[0] as ChatMessage, voiceOld, ...log.slice(1)]), "voice"),
    ).toBe("ready");
    expect(
      mediaAvailabilityOf(
        room([...log, { ...voiceOld, id: mediaLineId(A1, "voice", M2) }]),
        "voice",
      ),
    ).toBe("pending");
  });

  test("CM-U5c 대상에 결과가 있으면 done, 실패 줄만 있으면 다시 ready", () => {
    const done: ChatMessage = {
      id: mediaLineId(A1, "photo", M1),
      at: 3,
      kind: "photo",
      imageUrl: "https://x/a.png",
    };
    expect(mediaAvailabilityOf(room([...log, done]), "photo")).toBe("done");
    expect(mediaAvailabilityOf(room([...log, done]), "voice")).toBe("ready");
    const failed: ChatMessage = {
      id: mediaLineId(A1, "photo", M2),
      at: 3,
      kind: "media-notice",
      media: "photo",
      notice: "failed",
      until: null,
    };
    expect(mediaAvailabilityOf(room([...log, failed]), "photo")).toBe("ready");
  });
});

describe("로그 줄", () => {
  const target = { messageId: A1, text: { ko: "반가워요", en: "Nice to meet you" } };

  test("CM-U6a 상태마다 줄 모양", () => {
    // 대기 줄은 기기 시계의 시작 시각(`startedAt`)을 싣는다 — 넘겨받지 못하면 지금(리뷰 #541). `at`은 서버 시각 그대로.
    expect(mediaLineOf(media(), target, null, 9)).toEqual({
      id: mediaLineId(A1, "photo", M1),
      at: 5,
      kind: "photo-pending",
      startedAt: 9,
    });
    expect(mediaLineOf(media(), target, null, 9, 4)).toMatchObject({
      kind: "photo-pending",
      startedAt: 4,
    });
    expect(
      mediaLineOf(
        media({ status: "complete", path: "u/a.png", aspect: "1:1" }),
        target,
        "https://s/a",
        9,
      ),
    ).toEqual({
      id: mediaLineId(A1, "photo", M1),
      at: 5,
      kind: "photo",
      imageUrl: "https://s/a",
      aspect: "1:1",
      aiGenerated: true,
    });
    expect(mediaLineOf(media({ kind: "voice" }), target, null, 9).kind).toBe("voice-pending");
    expect(
      mediaLineOf(
        media({ kind: "voice", status: "complete", path: "u/a.mp3" }),
        target,
        "https://s/v",
        9,
      ),
    ).toEqual({
      id: mediaLineId(A1, "voice", M1),
      at: 5,
      kind: "voice",
      durationMs: 0,
      text: target.text,
      audioUrl: "https://s/v",
    });
    expect(
      mediaLineOf(media({ status: "blocked", failure: "check_failed" }), target, null, 9),
    ).toEqual({
      id: mediaLineId(A1, "photo", M1),
      at: 5,
      kind: "media-notice",
      media: "photo",
      notice: "blocked",
      until: null,
    });
    expect(mediaLineOf(media({ kind: "voice", status: "failed" }), target, null, 9)).toMatchObject({
      kind: "media-notice",
      media: "voice",
      notice: "failed",
    });
  });

  test("CM-U6b 줄은 대상 말풍선 뒤 · 같은 대상의 앞 결과 뒤에, 같은 id는 그 자리 교체", () => {
    const first = mediaLineOf(media(), target, null, 9);
    const placed = placeMediaLine([...log, mine("local-2")], first);
    expect(placed.map((m) => m.id)).toEqual([...log.map((m) => m.id), first.id, "local-2"]);
    const second = mediaLineOf(media({ id: M2, kind: "voice" }), target, null, 9);
    const both = placeMediaLine(placed, second);
    expect(both.map((m) => m.id).slice(-3)).toEqual([first.id, second.id, "local-2"]);
    const done = mediaLineOf(media({ status: "complete", path: "p" }), target, "u", 9);
    const swapped = placeMediaLine(both, done);
    expect(swapped).toHaveLength(both.length);
    expect(swapped.find((m) => m.id === first.id)?.kind).toBe("photo");
  });

  test("CM-U6c 대상이 로그에 없으면 그대로", () => {
    const line = mediaLineOf(media({ messageId: A0 }), { ...target, messageId: A0 }, null, 9);
    const only = [say(`${A1}#0`, "a", "b")];
    expect(placeMediaLine(only, line)).toEqual(only);
  });
});

describe("다시 읽기 간격", () => {
  // 다시 읽는 시각(시작부터 누적)과, 그 시각에 끝난 일을 처음 보는 시각 · 그때까지 읽은 횟수.
  const checks = (limit: number) => {
    const at: number[] = [];
    for (let step = 0, t = 0; t <= limit; step += 1) {
      t += mediaPollDelay(step);
      at.push(t);
    }
    return at;
  };
  const seen = (doneAt: number) => {
    const at = checks(MEDIA_POLL_LIMIT_MS);
    const index = at.findIndex((t) => t >= doneAt);
    return { at: at[index], requests: index + 1 };
  };

  test("CM-U7a 끝나는 구간(40초까지)은 2초마다, 그 뒤 5 · 10 · 15초로 늘고 꼬리는 30초", () => {
    expect([0, 1, 10, 19].map(mediaPollDelay)).toEqual([2_000, 2_000, 2_000, 2_000]);
    expect([20, 23, 24, 26, 27, 28, 29, 40].map(mediaPollDelay)).toEqual([
      5_000, 5_000, 10_000, 10_000, 15_000, 15_000, 30_000, 30_000,
    ]);
    expect(MEDIA_POLL_LIMIT_MS).toBe(660_000);
  });

  test("CM-U7c 서버가 끝낸 뒤 2초 안에 본다 — 음성(4초) · 사진(17초 · 25초 · 40초)", () => {
    expect(seen(4_000)).toEqual({ at: 4_000, requests: 2 });
    expect(seen(17_000)).toEqual({ at: 18_000, requests: 9 });
    expect(seen(25_000).at - 25_000).toBeLessThanOrEqual(2_000);
    expect(seen(40_000).at).toBe(40_000);
  });

  test("CM-U7d 오래 걸려도 읽는 횟수는 묶인다 — 60초 24번, 상한(11분)까지 50번 안", () => {
    expect(seen(60_000)).toEqual({ at: 60_000, requests: 24 });
    expect(checks(MEDIA_POLL_LIMIT_MS).length).toBeLessThanOrEqual(50);
  });

  test("CM-U7b 다음 UTC 자정", () => {
    expect(nextUtcMidnight(Date.parse("2026-11-15T23:59:59.000Z"))).toBe(
      Date.parse("2026-11-16T00:00:00.000Z"),
    );
    expect(nextUtcMidnight(Date.parse("2026-11-15T00:00:00.000Z"))).toBe(
      Date.parse("2026-11-16T00:00:00.000Z"),
    );
  });
});
