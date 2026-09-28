import { describe, expect, it } from "vitest";

import type { PrologueChatMessage } from "./episode-intro.contract";
import { prologueChatNext } from "./prologue-chat";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4).

const messages: readonly PrologueChatMessage[] = [
  { id: "m1", sender: "other", text: "잘 도착했어?", translation: "Did you arrive?" },
  { id: "m2", sender: "self", text: "잘 도착했어요!", translation: "I made it!" },
  { id: "m3", sender: "other", text: "부탁 하나 해도 될까?", translation: "Can I ask a favor?" },
];

describe("prologueChatNext", () => {
  it("C1. 다음이 상대 메시지면 저절로 온다", () => {
    expect(prologueChatNext(messages, 0)).toEqual({ kind: "incoming" });
    expect(prologueChatNext(messages, 2)).toEqual({ kind: "incoming" });
  });

  it("C2. 다음이 내 메시지면 그 메시지를 입력창에 채운다", () => {
    expect(prologueChatNext(messages, 1)).toEqual({ kind: "draft", message: messages[1] });
  });

  it("C3. 다 나왔으면 끝이다", () => {
    expect(prologueChatNext(messages, 3)).toEqual({ kind: "done" });
    expect(prologueChatNext(messages, 10)).toEqual({ kind: "done" });
  });

  it("C4. 음수는 처음으로 본다", () => {
    expect(prologueChatNext(messages, -1)).toEqual({ kind: "incoming" });
  });

  it("C5. 내 메시지로 시작하는 대화는 처음부터 입력창이 채워진다", () => {
    const selfFirst = [messages[1] as PrologueChatMessage];

    expect(prologueChatNext(selfFirst, 0)).toEqual({ kind: "draft", message: selfFirst[0] });
  });
});
