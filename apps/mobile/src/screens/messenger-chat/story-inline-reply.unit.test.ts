import { describe, expect, test } from "vitest";

import type { ChatMessage, ChatThread } from "./chat-source.contract";
import { myTextLine } from "./friend-stories";
import {
  canSendStoryReply,
  storyReplyGateOf,
  storyReplyStatusOf,
  type StoryReplyGateInput,
} from "./story-inline-reply";

// `unit` 계층(FS-U15 ~ U17): 보기에서 바로 보내는 답장(ADR-0178 D5 개정) — 앱 관문 · 배달 상태 · 보내기 단추.

const QUOTE = {
  storyId: "st-1",
  characterId: "owner",
  line: "라면",
  imagePath: null,
  postedAt: null,
} as const;

const gate = (over: Partial<StoryReplyGateInput> = {}) =>
  storyReplyGateOf({
    free: false,
    tier: "free",
    trialRemaining: 0,
    balance: 100,
    price: 3,
    charging: "server",
    ...over,
  });

describe("FS-U15 storyReplyGateOf — 대화방 입력 줄과 같은 관문, 첫 답장 무료는 앞에서", () => {
  test("무료 안내면 체험 · 엽전을 보지 않는다", () => {
    expect(gate({ free: true, balance: 0 })).toEqual({ kind: "story-free" });
  });
  test("관문 재료가 없거나(옛 결선) 무제한이면 열림", () => {
    expect(gate({ tier: null, balance: 0 })).toEqual({ kind: "open" });
    expect(gate({ tier: "unlimited", balance: 0 })).toEqual({ kind: "open" });
  });
  test("체험이 남았거나 남은 수를 모르면 체험", () => {
    expect(gate({ trialRemaining: 5 })).toEqual({ kind: "trial" });
    expect(gate({ trialRemaining: 1 })).toEqual({ kind: "trial" });
    expect(gate({ trialRemaining: null })).toEqual({ kind: "trial" });
  });
  test("체험을 다 썼으면 엽전 — 서버 방은 앱 지갑에서 빼지 않고, 앱 안 방은 뺀다", () => {
    expect(gate()).toEqual({ kind: "pay", price: 3, spend: false });
    expect(gate({ charging: "local" })).toEqual({ kind: "pay", price: 3, spend: true });
  });
  test("엽전이 모자라면 short(모자란 양)", () => {
    expect(gate({ balance: 1 })).toEqual({ kind: "short", shortBy: 2 });
    expect(gate({ balance: Number.NaN })).toEqual({ kind: "short", shortBy: 3 });
  });
});

function thread(
  messages: readonly ChatMessage[],
  over: Partial<ChatThread> = {},
  server: { unsent?: readonly string[] } | null = { unsent: [] },
): ChatThread {
  return {
    roomId: "owner",
    counterpart: { id: "owner", name: "사장님", avatarUrl: null },
    messages,
    typing: false,
    server:
      server === null ? null : { history: "loaded", unsent: server.unsent ?? [], recovery: "none" },
    awaitingReply: false,
    ideas: [],
    settings: {} as ChatThread["settings"],
    storyPoints: [],
    notes: {},
    ratings: {},
    inputBlock: null,
    ...over,
  } as ChatThread;
}

const old: ChatMessage = myTextLine("m-old", 1, "옛 글", QUOTE);
const before = new Set(["m-old"]);
const mine = (id: string) => myTextLine(id, 2, "맛있겠다!", QUOTE);
const notice = (id: string, kind: "no-credits" | "server-error"): ChatMessage =>
  ({ id: `${id}~failed`, at: 3, kind: "notice", notice: kind }) as ChatMessage;

describe("FS-U16 storyReplyStatusOf — 보낸 답장의 배달 상태", () => {
  test("방이 없거나 새 글이 서지 않았으면(출처가 거절) 실패", () => {
    expect(storyReplyStatusOf(null, before, "st-1")).toEqual({ kind: "failed", reason: "failed" });
    expect(storyReplyStatusOf(thread([old]), before, "st-1")).toEqual({
      kind: "failed",
      reason: "failed",
    });
  });
  test("다른 스토리를 인용한 새 글은 내 답장이 아니다", () => {
    const other = myTextLine("local-x", 2, "다른", { ...QUOTE, storyId: "st-2" });
    expect(storyReplyStatusOf(thread([old, other]), before, "st-1").kind).toBe("failed");
  });
  test("가짜 출처(server null)는 글이 서면 바로 보냄", () => {
    expect(storyReplyStatusOf(thread([old, mine("x1")], {}, null), before, "st-1")).toEqual({
      kind: "sent",
    });
  });
  test("서버 방: 아직 앱 id면 보내는 중, 서버 id로 바뀌면 보냄", () => {
    expect(storyReplyStatusOf(thread([old, mine("local-1")]), before, "st-1")).toEqual({
      kind: "sending",
    });
    expect(storyReplyStatusOf(thread([old, mine("srv-9")]), before, "st-1")).toEqual({
      kind: "sent",
    });
  });
  test("Not sent · 실패 줄이면 실패 — 엽전 부족은 coins", () => {
    expect(
      storyReplyStatusOf(
        thread([old, mine("local-1")], {}, { unsent: ["local-1"] }),
        before,
        "st-1",
      ),
    ).toEqual({ kind: "failed", reason: "failed" });
    expect(
      storyReplyStatusOf(
        thread([old, mine("local-1"), notice("local-1", "no-credits")]),
        before,
        "st-1",
      ),
    ).toEqual({ kind: "failed", reason: "coins" });
    expect(
      storyReplyStatusOf(
        thread([old, mine("local-1"), notice("local-1", "server-error")]),
        before,
        "st-1",
      ),
    ).toEqual({ kind: "failed", reason: "failed" });
  });
  test("서버가 입력을 막았으면(앱 id 그대로) 실패", () => {
    expect(
      storyReplyStatusOf(
        thread([old, mine("local-1")], { inputBlock: { kind: "age-restricted" } }),
        before,
        "st-1",
      ),
    ).toEqual({ kind: "failed", reason: "failed" });
  });
});

describe("FS-U17 canSendStoryReply — 빈 글 · 보내는 중이면 보내기 없음", () => {
  test("공백만이면 없음, 글이 있으면 있음, 보내는 중이면 없음", () => {
    expect(canSendStoryReply("", false)).toBe(false);
    expect(canSendStoryReply("   ", false)).toBe(false);
    expect(canSendStoryReply("안녕", false)).toBe(true);
    expect(canSendStoryReply("안녕", true)).toBe(false);
  });
});
