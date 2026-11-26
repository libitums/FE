import { describe, expect, test } from "vitest";

import { focusOriginOf } from "./chat-overlay-focus";
import { chatProfileModelOf, chatProfileVoiceUrlOf, type ChatProfilePort } from "./chat-profile";
import {
  chatRoomReducer,
  initialChatRoomState,
  OPEN_PROFILE,
  overlayParent,
} from "./chat-room-state";
import { guestGateOf } from "./guest-gate";
import { friend } from "./suggested-friends.test-support";

// `unit` 계층(CP-U1 ~ U6): 대화방 안 상대 프로필 시트(ADR-0178 개정 ⟨대화방⟩) — 겹침 전이 · 시트 모델 · 목소리 주소.

const mina = { id: "mina", name: "미나", avatarUrl: "https://img/mina.webp" };
const minaProfile = friend("mina", {
  name: "Mina",
  intro: { en: "Cafe owner" },
  tags: [{ en: "ENFP" }],
  voiceSamplePath: "voice/mina.mp3",
});
const port = (over: Partial<ChatProfilePort> = {}): ChatProfilePort => ({
  profileOf: (id) => (id === "mina" ? minaProfile : null),
  ...over,
});

describe("겹침 전이 (CP-U1 ~ U3)", () => {
  test("CP-U1. 키보드가 열린 채 프로필을 열면 키보드 자리 · 깔개 · 초점을 접고 시트를 연다", () => {
    const opened = chatRoomReducer(initialChatRoomState({ initial: "phone", toggle: "hidden" }), {
      type: "open-keyboard",
    });
    const next = chatRoomReducer({ ...opened, phoneFocus: "focused" }, OPEN_PROFILE);
    expect(next.overlay).toEqual({ kind: "profile" });
    expect(next.slot).toEqual({ kind: "closed" });
    expect(next.underlay).toBe("none");
    expect(next.phoneFocus).toBe("blurred");
  });

  test("CP-U2. 닫으면 방으로 돌아간다(부모 없음)", () => {
    expect(overlayParent({ kind: "profile" })).toEqual({ kind: "none" });
    const state = chatRoomReducer(
      initialChatRoomState({ initial: "learning", toggle: "shown" }),
      OPEN_PROFILE,
    );
    expect(chatRoomReducer(state, { type: "close-overlay" }).overlay).toEqual({ kind: "none" });
  });

  test("CP-U3. 닫힌 뒤 초점은 플랫폼에 맡긴다(같은 test-id 아바타가 여럿)", () => {
    expect(focusOriginOf({ kind: "profile" })).toBeNull();
  });
});

describe("chatProfileModelOf (CP-U4 · U5)", () => {
  test("CP-U4. 카탈로그 인물이면 소개 · 태그를 쓰고 이름 · 얼굴은 방의 것, 이미 친구 · 제안 없음", () => {
    const model = chatProfileModelOf(port(), mina);
    expect(model.status).toBe("added");
    expect(model.offer).toBeNull();
    expect(model.avatarUrl).toBe("https://img/mina.webp");
    expect(model.character.name).toBe("미나");
    expect(model.character.intro).toEqual({ en: "Cafe owner" });
    expect(model.character.tags).toEqual([{ en: "ENFP" }]);
  });

  test("CP-U5. 포트가 없거나 카탈로그 밖 인물이면 이름 · 얼굴만(소개 · 태그 · 첫 말 없음)", () => {
    for (const model of [
      chatProfileModelOf(null, mina),
      chatProfileModelOf(port(), { ...mina, id: "stranger" }),
    ]) {
      expect(model.status).toBe("added");
      expect(model.character.name).toBe("미나");
      expect(model.character.intro).toBeNull();
      expect(model.character.tags).toEqual([]);
      expect(model.character.sheetOpening).toBeNull();
    }
  });
});

describe("chatProfileVoiceUrlOf (CP-U6)", () => {
  test("CP-U6. 견본이 있고 포트가 풀면 주소, 아니면 null", () => {
    const model = chatProfileModelOf(port(), mina);
    const resolving = port({ voiceSampleUrl: (path) => `https://cdn/${path}` });
    expect(chatProfileVoiceUrlOf(resolving, model)).toBe("https://cdn/voice/mina.mp3");
    expect(chatProfileVoiceUrlOf(port(), model)).toBeNull();
    expect(chatProfileVoiceUrlOf(null, model)).toBeNull();
    expect(chatProfileVoiceUrlOf(resolving, chatProfileModelOf(null, mina))).toBeNull();
  });
});

test("CP-U7. 비회원도 프로필 시트는 그대로 연다 — 계정이 필요한 동작이 아니다(로그인 권유 없음, ADR-0166)", () => {
  expect(guestGateOf(OPEN_PROFILE)).toBeNull();
});
