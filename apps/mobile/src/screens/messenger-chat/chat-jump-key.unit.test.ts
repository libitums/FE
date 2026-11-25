import { describe, expect, test } from "vitest";

import { jumpKeyOf } from "./chat-jump-key";
import type { ChatMessage } from "./chat-source.contract";

// `unit` 계층(chat-scroll-follow F · G): jumpKey는 학습자가 무언가를 보냈을 때만 바뀐다 — id만 바뀌는 교체는 계기가 아니다.

const SERVER = "0b6f3a52-6a5e-4c1d-9f9e-2a7f0f6b9c11";
const them = (id: string, ko = "안녕"): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko, en: "hi" },
});
const mine = (id: string, ko = "반가워요"): ChatMessage => ({
  id,
  at: 2,
  kind: "text",
  from: "me",
  text: { ko, en: "nice" },
});
const log = [them(`${SERVER}#0`)];

describe("jumpKeyOf", () => {
  test("JK-U1. 내 글이 늘면 바뀐다", () => {
    expect(jumpKeyOf([...log, mine("local-a")])).not.toBe(jumpKeyOf(log));
  });

  test("JK-U2. 내 글의 id만 서버 id로 바뀌면 그대로다(보낸 직후 한 번 더 끌어내리지 않음)", () => {
    const local = [...log, mine("local-a"), them(`${SERVER}#1`)];
    const swapped = [...log, mine("7d0c9a1e-1111-4a2b-8c3d-000000000001"), them(`${SERVER}#1`)];
    expect(jumpKeyOf(swapped)).toBe(jumpKeyOf(local));
  });

  test("JK-U3. 고친 문장으로 다시 보내면(옛 턴이 빠지고 새 글) 바뀐다", () => {
    const before = [...log, mine("fx-3", "학교에 갔어요"), them("fx-4")];
    const resent = [...log, mine("fx-5", "학교에 갔어요!")];
    expect(jumpKeyOf(resent)).not.toBe(jumpKeyOf(before));
  });

  test("JK-U4. 사진 · 음성 요청(대기 줄)이 서면 바뀐다", () => {
    const pendingPhoto: ChatMessage = {
      id: `${SERVER}~snapshot~req`,
      at: 3,
      kind: "photo-pending",
      startedAt: 3,
    };
    const pendingVoice: ChatMessage = { id: "fx-9", at: 3, kind: "voice-pending", startedAt: 3 };
    expect(jumpKeyOf([...log, pendingPhoto])).not.toBe(jumpKeyOf(log));
    expect(jumpKeyOf([...log, pendingVoice])).not.toBe(jumpKeyOf(log));
  });

  test("JK-U5. 매체 줄이 자리표시자 → 서버 id → 완료 · 고지로 바뀌어도 그대로다", () => {
    const at = (line: ChatMessage) => jumpKeyOf([...log, line]);
    const req = at({ id: `${SERVER}~snapshot~req`, at: 3, kind: "photo-pending", startedAt: 3 });
    expect(at({ id: `${SERVER}~snapshot~m1`, at: 3, kind: "photo-pending", startedAt: 3 })).toBe(
      req,
    );
    expect(at({ id: `${SERVER}~snapshot~m1`, at: 4, kind: "photo", imageUrl: null })).toBe(req);
    expect(
      at({
        id: `${SERVER}~snapshot~x1`,
        at: 4,
        kind: "media-notice",
        media: "photo",
        notice: "request-failed",
        until: null,
      }),
    ).toBe(req);
    // 가짜 출처는 대기 줄과 결과 줄이 같은 id다.
    const fxPending = at({ id: "fx-9", at: 3, kind: "voice-pending", startedAt: 3 });
    expect(
      at({ id: "fx-9", at: 4, kind: "voice", durationMs: 900, text: { ko: "네", en: "yes" } }),
    ).toBe(fxPending);
  });

  test("JK-U6. 상대 말이 늘어도 그대로다", () => {
    const sent = [...log, mine("local-a")];
    expect(jumpKeyOf([...sent, them(`${SERVER}#1`, "좋아요")])).toBe(jumpKeyOf(sent));
  });
});
