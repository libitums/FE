import { describe, expect, test, vi } from "vitest";

import type { ChatCorrection } from "./chat-feedback.contract";
import {
  canSendRating,
  correctionSpoken,
  readyResend,
  latestReplyId,
  RATING_NOTE_MAX,
  resendableMessageId,
  resendTextOf,
} from "./chat-feedback-rules";
import { chatFixtureSeed } from "./chat-fixture";
import { createFixtureChatSource } from "./chat-fixture-source";
import { focusOriginOf } from "./chat-overlay-focus";
import { resendIfReady } from "./use-chat-feedback";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatMessage } from "./chat-source.contract";
import { fixtureRoom, seedOf } from "./chat-ui.test-support";
import { messengerChatEn } from "../../lib/ui-copy-en-chat";

// `unit` 계층(CR-U1 ~ U9): 교정 카드 다시 보내기 · 답 평가(ADR-0129) — 규칙 · 가짜 출처.

const me = (id: string, ko: string): ChatMessage => ({
  id,
  at: 0,
  kind: "text",
  from: "me",
  text: { ko, en: "" },
});
const them = (id: string): ChatMessage => ({
  id,
  at: 0,
  kind: "text",
  from: "them",
  text: { ko: "네", en: "Yes" },
});
const card = (over: Partial<ChatCorrection> = {}): ChatCorrection => ({
  kind: "correction",
  corrected: "저는 커피를 좋아해요.",
  changes: [],
  items: [],
  better: null,
  meaning: null,
  ...over,
});

describe("규칙", () => {
  test("CR-U1 다시 보내기 — 마지막 내 글이고 그 뒤는 캐릭터 글 답뿐일 때만, 답을 기다리는 중이면 아니다", () => {
    const thread = { messages: [them("t1"), me("m1", "저 커피"), them("t2")], typing: false };
    expect(resendableMessageId(thread, false)).toBe("m1");
    expect(resendableMessageId({ ...thread, messages: [them("t1"), me("m1", "a")] }, false)).toBe(
      "m1",
    );
    expect(resendableMessageId(thread, true)).toBeNull();
    expect(resendableMessageId({ ...thread, typing: true }, false)).toBeNull();
    expect(resendableMessageId({ messages: [them("t1")], typing: false }, false)).toBeNull();
    const photo: ChatMessage = { id: "p", at: 0, kind: "photo", imageUrl: null };
    expect(
      resendableMessageId({ messages: [me("m1", "a"), photo], typing: false }, false),
    ).toBeNull();
  });

  test("CR-U2 평가 자리 — 가장 최근 캐릭터 글, 없으면 null", () => {
    expect(
      latestReplyId({ messages: [them("t1"), me("m1", "a"), them("t2")], typing: false }),
    ).toBe("t2");
    expect(latestReplyId({ messages: [them("t1"), me("m1", "a")], typing: false })).toBe("t1");
    expect(latestReplyId({ messages: [me("m1", "a")], typing: false })).toBeNull();
  });

  test("CR-U3 다시 보낼 글 — better는 더 나은 글, 그 밖은 고친 문장", () => {
    expect(resendTextOf(card())).toBe("저는 커피를 좋아해요.");
    expect(resendTextOf(card({ kind: "l1_to_ko", corrected: "카페에 갔어요." }))).toBe(
      "카페에 갔어요.",
    );
    expect(
      resendTextOf(
        card({
          kind: "better",
          better: { text: "저 커피 좋아해요.", meaning: "", explanation: "" },
        }),
      ),
    ).toBe("저 커피 좋아해요.");
  });

  test("CR-U4 👎는 이유가 하나 이상일 때만 보낸다, 메모는 200자", () => {
    expect(canSendRating([])).toBe(false);
    expect(canSendRating(["too_hard"])).toBe(true);
    expect(RATING_NOTE_MAX).toBe(200);
  });
});

const make = () => {
  const timers = fakeTimers();
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...seedOf(fixtureRoom("mina")), corrections: chatFixtureSeed.corrections ?? [] },
    now: () => 1_800_000_000_000,
    timers,
  });
  return { source, timers };
};

describe("낭독 문장", () => {
  test("CR-U12 카드 낭독은 문장 부호를 겹치지 않는다(기기 확인)", () => {
    const fix = card({
      corrected: "저는 체크아웃이 몇 시예요?",
      items: [{ original: "저", corrected: "저는", reason: "Add 는 to mark the topic." }],
    });
    expect(correctionSpoken(fix, messengerChatEn.feedback)).toBe(
      "FIX: 저는 체크아웃이 몇 시예요? 저 → 저는, Add 는 to mark the topic.",
    );
    const korean = card({
      kind: "l1_to_ko",
      corrected: "카페에 갔어요",
      meaning: "I went to a café",
    });
    expect(correctionSpoken(korean, messengerChatEn.feedback)).toBe(
      "IN KOREAN: 카페에 갔어요. I went to a café.",
    );
  });
});

describe("가짜 출처 — 평가", () => {
  test("CR-U5 평가를 남기고 지우며, 같은 값이면 알리지 않는다", () => {
    const { source } = make();
    const id = source.thread("mina")?.messages[0]?.id ?? "";
    const listener = vi.fn<() => void>();
    source.subscribe(listener);
    source.rateMessage("mina", id, { value: "up" });
    expect(source.thread("mina")?.ratings[id]).toEqual({ value: "up" });
    source.rateMessage("mina", id, { value: "up" });
    expect(listener).toHaveBeenCalledTimes(1);
    source.rateMessage("mina", id, { value: "down", reasons: ["too_hard"], note: null });
    expect(source.thread("mina")?.ratings[id]).toMatchObject({
      value: "down",
      reasons: ["too_hard"],
    });
    source.rateMessage("mina", id, null);
    expect(source.thread("mina")?.ratings[id]).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

describe("가짜 출처 — 다시 보내기", () => {
  const sendAndFix = () => {
    const { source, timers } = make();
    source.sendText("mina", "저 커피 좋아해요.");
    timers.advance(10_000); // 답 도착
    const mine = source.thread("mina")?.messages.find((m) => m.kind === "text" && m.from === "me");
    source.openCorrection("mina", mine?.id ?? "");
    timers.advance(1_000); // 교정 준비
    return { source, timers, mineId: mine?.id ?? "" };
  };

  test("CR-U6 마지막 내 글이면 옛 턴을 빼고 고친 글을 새로 보낸다", () => {
    const { source, timers, mineId } = sendAndFix();
    const before = source.thread("mina")?.messages.length ?? 0;
    source.resendCorrected("mina", mineId);
    const thread = source.thread("mina");
    expect(thread?.messages.some((m) => m.id === mineId)).toBe(false);
    const last = thread?.messages[thread.messages.length - 1];
    expect(last).toMatchObject({ kind: "text", from: "me", text: { ko: "저는 커피를 좋아해요." } });
    expect(thread?.messages.length).toBe(before - 1);
    timers.advance(10_000);
    expect(source.thread("mina")?.messages.at(-1)).toMatchObject({ from: "them" });
  });

  test("CR-U7 마지막 내 글이 아니면 무동작", () => {
    const { source, timers, mineId } = sendAndFix();
    source.sendText("mina", "또 보냄");
    timers.advance(10_000);
    const before = source.thread("mina")?.messages;
    source.resendCorrected("mina", mineId);
    expect(source.thread("mina")?.messages).toBe(before);
  });

  test("CR-U8 교정이 아직 준비되지 않았으면 무동작(답이 온 마지막 내 글이어도)", () => {
    const { source, timers } = make();
    source.sendText("mina", "저 커피 좋아해요.");
    timers.advance(10_000);
    const mine =
      source.thread("mina")?.messages.find((m) => m.kind === "text" && m.from === "me")?.id ?? "";
    source.openCorrection("mina", mine);
    const before = source.thread("mina")?.messages;
    source.resendCorrected("mina", mine); // 아직 loading
    expect(source.thread("mina")?.messages).toBe(before);
  });

  test("CR-U8b 답을 기다리는 중이면 다시 보낼 글이 없다 — awaitingReply가 판정에 든다", () => {
    const { source, mineId } = sendAndFix();
    source.resendCorrected("mina", mineId);
    const thread = source.thread("mina");
    expect(thread?.awaitingReply).toBe(true);
    if (thread === null || thread === undefined) throw new Error("no thread");
    expect(resendableMessageId(thread, thread.awaitingReply)).toBeNull();
    expect(readyResend(thread, thread.messages.at(-1)?.id ?? "")).toBeNull();
  });

  test("CR-U9 지운 턴의 평가 · 노트도 함께 빠진다", () => {
    const { source, mineId } = sendAndFix();
    const reply = source.thread("mina")?.messages.at(-1)?.id ?? "";
    source.rateMessage("mina", reply, { value: "up" });
    source.resendCorrected("mina", mineId);
    const thread = source.thread("mina");
    expect(thread?.ratings[reply]).toBeUndefined();
    expect(thread?.notes[mineId]).toBeUndefined();
  });
});

describe("다시 보내기 관문 (리뷰 C1)", () => {
  const ready = () => {
    const timers = fakeTimers();
    const source = createFixtureChatSource({
      imageUrlOf: () => null,
      seed: { ...seedOf(fixtureRoom("mina")), corrections: chatFixtureSeed.corrections ?? [] },
      now: () => 1_800_000_000_000,
      timers,
    });
    source.sendText("mina", "저 커피 좋아해요.");
    timers.advance(10_000);
    const mineId =
      source.thread("mina")?.messages.find((m) => m.kind === "text" && m.from === "me")?.id ?? "";
    source.openCorrection("mina", mineId);
    timers.advance(1_000);
    return { source, mineId };
  };

  test("CR-U13 같은 렌더 안에서 두 번 눌러도 관문은 한 번만 지나고 한 통만 간다", () => {
    const { source, mineId } = ready();
    const authorizeSend = vi.fn<() => boolean>(() => true);
    const input = { roomId: "mina", source, authorizeSend };
    expect(resendIfReady(input, mineId)).toBe(true);
    expect(resendIfReady(input, mineId)).toBe(false);
    expect(authorizeSend).toHaveBeenCalledTimes(1);
    const mine = source
      .thread("mina")
      ?.messages.filter((m) => m.kind === "text" && m.from === "me");
    expect(mine).toHaveLength(1);
  });

  test("CR-U14 관문이 막으면(엽전 모자람) 보내지 않고 옛 턴도 그대로", () => {
    const { source, mineId } = ready();
    const before = source.thread("mina")?.messages;
    expect(resendIfReady({ roomId: "mina", source, authorizeSend: () => false }, mineId)).toBe(
      false,
    );
    expect(source.thread("mina")?.messages).toBe(before);
  });

  test("CR-U15 👎에서 연 신고 시트가 닫히면 초점은 👎, 「…」에서 연 것은 「…」", () => {
    expect(focusOriginOf({ kind: "report", reasons: [], from: "rating" })).toBe("rating");
    expect(focusOriginOf({ kind: "report", reasons: [] })).toBe("more");
  });
});
