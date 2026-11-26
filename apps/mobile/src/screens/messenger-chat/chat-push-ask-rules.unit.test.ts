import { describe, expect, test } from "vitest";

import {
  initialReplyWatch,
  replyArrived,
  replyWatchNext,
  type ReplyWatch,
} from "./chat-push-ask-rules";
import type { ChatMessage } from "./chat-source.contract";

// `unit` 계층: 「이번 입장에서 보낸 말에 인물이 처음 답했다」 판정(ADR-0197 D1).

const mine = (id: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "me",
  text: { ko: "안녕", en: "" },
});
const theirs = (id: string): ChatMessage => ({
  id,
  at: 2,
  kind: "text",
  from: "them",
  text: { ko: "네", en: "Yes" },
});
const photo = (id: string): ChatMessage => ({ id, at: 3, kind: "photo-pending" });

function run(...steps: (readonly ChatMessage[])[]): ReplyWatch {
  return steps.reduce<ReplyWatch>(
    (watch, messages) => replyWatchNext(watch, messages),
    initialReplyWatch,
  );
}

describe("replyWatchNext · replyArrived", () => {
  test("CPA-R1. 방을 열 때 있던 기록은 보낸 말 · 답으로 세지 않는다", () => {
    const watch = run([theirs("a"), mine("b"), theirs("c")]);
    expect(watch.sent).toBe(false);
    expect(replyArrived(watch, false)).toBe(false);
  });

  test("CPA-R2. 내 말 하나가 서고 그 뒤 인물의 글이 서면, 기다림이 끝났을 때 답이 도착했다", () => {
    const opened = [theirs("a")];
    const sent = [...opened, mine("m1")];
    const replied = [...sent, theirs("r1")];
    const watch = run(opened, sent, replied);
    expect(watch.sent).toBe(true);
    expect(watch.heard).toBe(true);
    expect(replyArrived(watch, true)).toBe(false);
    expect(replyArrived(watch, false)).toBe(true);
  });

  test("CPA-R3. 늦게 온 기록(여러 줄이 한꺼번에) · 첫 인사(내 말 없이 인물이 먼저)는 보낸 말이 아니다", () => {
    const history = run([], [theirs("a"), mine("b"), theirs("c")]);
    expect(history.sent).toBe(false);
    const greeting = run([], [theirs("g")]);
    expect(greeting.sent).toBe(false);
    expect(replyArrived(greeting, false)).toBe(false);
  });

  test("CPA-R4. 보낸 뒤 사진 자리 · 행동 줄만 서면 아직 답이 아니다", () => {
    const watch = run([], [mine("m1")], [mine("m1"), photo("p1")]);
    expect(watch.sent).toBe(true);
    expect(replyArrived(watch, false)).toBe(false);
  });

  test("CPA-R5. 서버 방 — 내 말 id가 서버 id로 바뀌며 답과 함께 서도, 먼저 보낸 것으로 답이 된다", () => {
    const watch = run([], [mine("local-1")], [mine("U1"), theirs("A1")]);
    expect(watch.heard).toBe(true);
    expect(replyArrived(watch, false)).toBe(true);
  });

  test("CPA-R6. 같은 줄이 자라기만 하면(조각 · 같은 id) 새로 선 것이 아니다", () => {
    const sent = run([], [mine("m1")]);
    const again = replyWatchNext(sent, [mine("m1")]);
    expect(again.sent).toBe(true);
    expect(again.heard).toBe(false);
  });
});
