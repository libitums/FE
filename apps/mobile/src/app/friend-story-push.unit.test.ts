import { afterEach, describe, expect, test } from "vitest";

import { createFixtureChatSource } from "../screens/messenger-chat/chat-fixture-source";
import type { ChatFixtureRoom } from "../screens/messenger-chat/chat-source.contract";
import { takePendingStoryOpen } from "../screens/messenger-chat/story-reply-handoff";
import { companionPushActions } from "./companion-push";
import { pushTargetFrom } from "./push-target";

// `unit` 계층(FS-U14): 스토리 알림 목적지(ADR-0177 D7) — `companion-chat` + `story: true`. 옛 앱은 방을 열고(뒤로 맞음), 새 앱은
// 메신저 목록으로 가서 그 인물의 스토리를 엽니다(목록이 스토리를 읽은 뒤 — 없으면 방).

afterEach(() => {
  takePendingStoryOpen();
});

const room = (id: string): ChatFixtureRoom => ({
  roomId: `room-${id}`,
  counterpart: { id, name: id, avatarPath: null },
  access: { kind: "open" },
  unread: 0,
  messages: [],
  storyPoints: [],
  settings: { autoIdeas: true, storyPointId: "" },
  ideaSets: [],
  cannedReplies: [],
  photoPath: null,
  voiceLine: { durationMs: 1000, text: { ko: "네", en: "Yes" } },
});

describe("FS-U14 스토리 알림", () => {
  test("story: true만 스토리 목적지 — 그 밖의 값은 무시", () => {
    expect(pushTargetFrom({ kind: "companion-chat", characterId: "mina", story: true })).toEqual({
      kind: "companion-chat",
      characterId: "mina",
      variant: null,
      story: true,
    });
    expect(pushTargetFrom({ kind: "companion-chat", characterId: "mina", story: "yes" })).toEqual({
      kind: "companion-chat",
      characterId: "mina",
      variant: null,
    });
  });

  test("스토리 목적지는 메신저 목록까지만 가고 그 인물의 스토리 열기를 남긴다", () => {
    const source = createFixtureChatSource({
      imageUrlOf: () => null,
      seed: { rooms: [room("mina")], birthYear: { kind: "set", year: 2000 } },
    });
    const actions = companionPushActions(source, "mina", true, true);
    expect(actions.some((action) => action.type === "push")).toBe(false);
    expect(takePendingStoryOpen()).toBe("mina");
  });

  test("메신저를 쓸 수 없는 계정이면 스토리 열기를 남기지 않는다", () => {
    const source = createFixtureChatSource({
      imageUrlOf: () => null,
      seed: { rooms: [room("mina")], birthYear: { kind: "set", year: 2000 } },
    });
    companionPushActions(source, "mina", false, true);
    expect(takePendingStoryOpen()).toBeNull();
  });
});
