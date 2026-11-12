import { describe, expect, test } from "vitest";

import { uiCopyEn } from "./ui-copy-en";
import { uiCopyEs } from "./ui-copy-es";
import { uiCopyId } from "./ui-copy-id";
import { uiCopyJa } from "./ui-copy-ja";
import { uiCopyVi } from "./ui-copy-vi";
import {
  messengerChatKeyPaths,
  messengerChatProblems,
} from "./ui-copy-messenger-chat.test-support";
import type { UiCopy } from "./ui-copy.contract";

// `unit` 계층(MC2-U25): 메신저 1.5 단계 문구 — 새 구획 셋 · 젬 → 엽전 이름 바꿈 · 다섯 언어의 키 집합
// (messenger-chat-1-5 spec §9). 다섯 언어를 한 파일에서 본다(언어별 unit 파일의 기존 키 집합 점검은 그대로).
// 무제한 티켓은 학습 전용이라(2026-11-10 결정) 메신저 문구에는 「Go unlimited」가 없다.

const languages: readonly (readonly [string, UiCopy])[] = [
  ["en", uiCopyEn],
  ["es", uiCopyEs],
  ["id", uiCopyId],
  ["ja", uiCopyJa],
  ["vi", uiCopyVi],
];

const chatOf = (copy: UiCopy): Record<string, Record<string, unknown>> =>
  (copy as unknown as { messengerChat: Record<string, Record<string, unknown>> }).messengerChat;

const REQUIRED_KEYS: readonly string[] = [
  "myMessage.meaningButton",
  "myMessage.fixButton",
  "myMessage.fixButtonNew",
  "myMessage.expanded",
  "myMessage.collapsed",
  "myMessage.loadingMeaning",
  "myMessage.loadingFix",
  "myMessage.better",
  "myMessage.fixLabel",
  "turns.freeLeft",
  "turns.lastFree",
  "turns.used",
  "turns.coinEach",
  "turns.reset",
  "turns.strip",
  "turns.outTitle",
  "turns.outBody",
  "turns.keepChatting",
  "turns.perMessage",
  "turns.keepChattingLabel",
  "turns.backToChats",
  "turns.balance",
  "turns.coinSendLabel",
  "turns.coinSendShortLabel",
  "newFriend.newFriend",
  "newFriend.episodeChip",
  "newFriend.metIn",
  "newFriend.reply",
  "newFriend.later",
  "newFriend.sheetLabel",
  "list.coinsLabel",
  "list.newBadge",
  "list.newFriendLabel",
  "askMedia.balance",
  "askMedia.confirmLabel",
  "askMedia.getCoins",
  "sidebar.myCoins",
  "sidebar.getCoins",
  "features.pillLabel",
];
const OLD_KEYS: readonly string[] = [
  "list.gemsLabel",
  "askMedia.getGems",
  "sidebar.myGems",
  "sidebar.getGems",
];

describe.each(languages)("%s messengerChat (MC2-U25)", (_code, copy) => {
  test("MC2-U25. 새 구획 셋(myMessage · turns · newFriend)과 이름 바꾼 키가 모두 있다", () => {
    const paths = new Set(messengerChatKeyPaths(copy));
    const missing = REQUIRED_KEYS.filter((key) => !paths.has(key));
    expect(missing).toEqual([]);
  });

  test("MC2-U25. 옛 젬 키(gemsLabel · getGems · myGems)가 없다", () => {
    const paths = new Set(messengerChatKeyPaths(copy));
    expect(OLD_KEYS.filter((key) => paths.has(key))).toEqual([]);
  });

  test("MC2-U25. 키 집합이 영어와 같고 함수 키가 빈 문자열을 내지 않으며 한글이 「」 밖에 없다", () => {
    expect(messengerChatKeyPaths(copy)).toEqual(messengerChatKeyPaths(uiCopyEn));
    expect(messengerChatProblems(copy, uiCopyEn)).toEqual([]);
  });

  test("MC2-U25. 함수 문구는 받은 값을 문장에 담는다(숫자 · 이름)", () => {
    const m = chatOf(copy);
    const call = (section: string, key: string, ...args: unknown[]): string => {
      const fn = m[section]?.[key];
      expect(typeof fn, `${section}.${key}`).toBe("function");
      return String((fn as (...a: unknown[]) => unknown)(...args));
    };
    const has = (text: string, ...parts: string[]) => {
      for (const part of parts) expect(text).toContain(part);
    };
    has(call("turns", "freeLeft", 2, 3), "2", "3");
    has(call("turns", "coinEach", 10, "5h 12m"), "10", "5h 12m");
    has(call("turns", "strip", 10), "10");
    has(call("turns", "outTitle", 3), "3");
    has(call("turns", "outBody", "5h 12m"), "5h 12m");
    has(call("turns", "perMessage", 10), "10");
    has(call("turns", "keepChattingLabel", 10), "10");
    has(call("turns", "balance", 100), "100");
    has(call("turns", "coinSendLabel", 10), "10");
    expect(String(m.turns?.coinSendShortLabel ?? "")).not.toBe("");
    has(call("turns", "reset", 5, 12), "5", "12");
    has(call("newFriend", "episodeChip", 3), "3");
    has(call("newFriend", "metIn", 3, "Guesthouse"), "3", "Guesthouse");
    has(call("newFriend", "sheetLabel", "Mina"), "Mina");
    has(call("myMessage", "fixLabel", "Better text", "Because"), "Better text", "Because");
    has(call("list", "coinsLabel", 5), "5");
    has(call("askMedia", "balance", 100), "100");
    has(call("askMedia", "confirmLabel", 60), "60");
    has(call("features", "pillLabel", "Snapshot", 60), "Snapshot", "60");
  });
});

describe("en messengerChat 영어 문구 표본 (MC2-U25)", () => {
  const m = chatOf(uiCopyEn);
  const fn = (section: string, key: string) =>
    m[section]?.[key] as ((...args: unknown[]) => string) | undefined;

  test("MC2-U25. 엽전 이름 바꿈 문구", () => {
    expect(fn("list", "coinsLabel")?.(5)).toBe("5 coins, get more");
    expect(fn("askMedia", "balance")?.(100)).toBe("You have 100 coins");
    expect(fn("askMedia", "confirmLabel")?.(60)).toBe("Ask for 60 coins");
    expect(m.askMedia?.getCoins).toBe("Get coins");
    expect(m.sidebar?.myCoins).toBe("My coins");
    expect(m.sidebar?.getCoins).toBe("Get coins");
    expect(fn("features", "pillLabel")?.("Snapshot", 60)).toBe("Snapshot, 60 coins");
    expect(m.list?.newBadge).toBe("NEW");
    expect(m.list?.newFriendLabel).toBe("New friend");
  });

  test("MC2-U25. 턴 문구", () => {
    expect(fn("turns", "freeLeft")?.(3, 3)).toBe("3 of 3 free messages left today");
    expect(m.turns?.lastFree).toBe("Last free message today");
    expect(m.turns?.used).toBe("Free messages used");
    expect(fn("turns", "coinEach")?.(10, "5h 12m")).toBe(
      "Each message 10 coins · free again in 5h 12m",
    );
    expect(fn("turns", "reset")?.(5, 12)).toBe("5h 12m");
    expect(fn("turns", "strip")?.(10)).toBe("After this, 10 coins per message");
    // 무제한 티켓은 학습 전용입니다 — 메신저 문구에 Go unlimited가 없습니다(2026-11-10 결정).
    expect(m.turns).not.toHaveProperty("goUnlimited");
    expect(fn("turns", "outTitle")?.(3)).toBe("Today's 3 free messages are used");
    expect(fn("turns", "outBody")?.("5h 12m")).toBe(
      "Keep chatting with coins, or come back in 5h 12m for free ones.",
    );
    expect(m.turns?.keepChatting).toBe("Keep chatting");
    expect(fn("turns", "perMessage")?.(10)).toBe("10 / message");
    expect(fn("turns", "keepChattingLabel")?.(10)).toBe("Keep chatting, 10 coins per message");
    expect(m.turns?.backToChats).toBe("Back to chats");
    expect(fn("turns", "balance")?.(100)).toBe("You have 100 coins");
    expect(fn("turns", "coinSendLabel")?.(10)).toBe("Send for 10 coins");
    expect(m.turns?.coinSendShortLabel).toBe("Get coins to send");
  });

  test("MC2-U25. 내 말풍선 · 새 친구 문구", () => {
    expect(m.myMessage?.meaningButton).toBe("See the meaning");
    expect(m.myMessage?.fixButton).toBe("See a better way to say it");
    expect(m.myMessage?.fixButtonNew).toBe("See a better way to say it, new");
    expect(m.myMessage?.expanded).toBe("Expanded");
    expect(m.myMessage?.collapsed).toBe("Collapsed");
    expect(m.myMessage?.loadingMeaning).toBe("Loading the meaning…");
    expect(m.myMessage?.loadingFix).toBe("Loading a better way…");
    expect(m.myMessage?.better).toBe("BETTER");
    expect(fn("myMessage", "fixLabel")?.("Hi", "Why")).toBe("Better: Hi. Why");
    expect(m.newFriend?.newFriend).toBe("NEW FRIEND");
    expect(fn("newFriend", "episodeChip")?.(3)).toBe("Episode 3");
    expect(fn("newFriend", "metIn")?.(3, "Mina")).toBe("Met in Episode 3 · Mina");
    expect(m.newFriend?.reply).toBe("Reply");
    expect(m.newFriend?.later).toBe("Later");
    expect(fn("newFriend", "sheetLabel")?.("Mina")).toBe("New friend: Mina");
  });

  test("MC2-U25. 영어 messengerChat 값에 「gem」 낱말이 없다", () => {
    const outputs: string[] = [];
    const walk = (node: unknown): void => {
      if (typeof node === "string") outputs.push(node);
      else if (typeof node === "function") {
        for (const args of [
          ["Mina", 5, 12, "x"],
          [5, 12, 3, 1],
        ]) {
          outputs.push(String((node as (...a: unknown[]) => unknown)(...args)));
        }
      } else if (node !== null && typeof node === "object") {
        for (const child of Object.values(node as Record<string, unknown>)) walk(child);
      }
    };
    walk(m);
    expect(outputs.length).toBeGreaterThan(0);
    expect(outputs.filter((text) => /\bgems?\b/i.test(text))).toEqual([]);
  });
});
