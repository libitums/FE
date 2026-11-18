import { describe, expect, test } from "vitest";

import type { FriendsCopy } from "../screens/messenger-chat/chat-friends.contract";
import { messengerChatFriendsEn } from "./ui-copy-en-chat-friends";
import { messengerChatFriendsEs } from "./ui-copy-es-chat-friends";
import { messengerChatFriendsId } from "./ui-copy-id-chat-friends";
import { messengerChatFriendsJa } from "./ui-copy-ja-chat-friends";
import { messengerChatFriendsVi } from "./ui-copy-vi-chat-friends";

// `unit` 계층(RF-U70 · U71): 추천 친구 문구는 다섯 화면 언어 모두 빈 칸이 없고, 표마다 자기 프로필 번역 언어를 고른다. 영어 문구는
// 결정한 말 그대로다(AI 표시는 방 고지와 같은 갈래).

const tables: [string, FriendsCopy][] = [
  ["en", messengerChatFriendsEn],
  ["es", messengerChatFriendsEs],
  ["id", messengerChatFriendsId],
  ["ja", messengerChatFriendsJa],
  ["vi", messengerChatFriendsVi],
];

describe("추천 친구 문구 (RF-U70 · U71)", () => {
  test.each(tables)("RF-U70 %s — 모든 칸이 비지 않고 이름 · 나이를 넣는다", (language, copy) => {
    expect(copy.profileLanguage).toBe(language);
    for (const text of [
      copy.stripTitle,
      copy.addFriend,
      copy.close,
      copy.ageLabel,
      copy.jobLabel,
      copy.mbtiLabel,
      copy.aiLabel,
      copy.adultTitle,
      copy.adultConfirm,
      copy.adultCancel,
    ])
      expect(text.trim()).not.toBe("");
    expect(copy.adultBody("차서연")).toContain("차서연");
    expect(copy.unavailable("권해준")).toContain("권해준");
    expect(copy.openProfile("미나")).toContain("미나");
    expect(copy.cardLabel("송다은", "Job")).toContain("송다은");
    expect(copy.age({ kind: "years", value: 28 })).toContain("28");
    expect(copy.age({ kind: "decade", value: 30 })).toContain("30");
    expect(copy.age({ kind: "range", from: 25, to: 26 })).toContain("26");
  });

  test("RF-U71 영어 — 줄 제목 · 단추 · AI 표시 · 성인 확인", () => {
    const copy = messengerChatFriendsEn;
    expect(copy.stripTitle).toBe("Recommended friends");
    expect(copy.addFriend).toBe("Add friend");
    expect(copy.aiLabel).toBe("AI character. Replies are written by AI.");
    expect(copy.adultBody("Seoyeon")).toContain("romantic");
    expect(copy.age({ kind: "decade", value: 30 })).toBe("30s");
  });
});
