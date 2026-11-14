import { describe, expect, test } from "vitest";

import {
  CHARACTER_UNLOCKS,
  NEW_FRIEND_TIMING,
  characterUnlockFor,
  newFriendReducer,
  newFriendTimelineOf,
  replyButtonStateOf,
  type CharacterUnlockEntry,
  type NewFriendEvent,
  type NewFriendPhase,
} from "./new-friend";

// `unit` 계층(MC2-U15 · U16): 해금 표 · 해금 판정 · 시트 단계 · 시간표(messenger-chat-1-5 spec §4.4).

const MINA: CharacterUnlockEntry = {
  episodeId: "u03-mina",
  characterId: "mina",
  roomId: "mina",
  sceneImagePath: "content/images/u03-mina/pre-1.webp",
  faceImagePath: "content/images/profiles/mina-casual.webp",
};

describe("characterUnlockFor (MC2-U15)", () => {
  test("MC2-U15. u03-mina 를 끝냈고 아직 안 열렸으면 미나 줄을 돌려준다", () => {
    expect(characterUnlockFor({ episodeId: "u03-mina", unlocked: new Set() })).toEqual(MINA);
  });

  test("MC2-U15. 이미 열린 인물이면 null 이다(다시 끝내도 시트 없음)", () => {
    expect(characterUnlockFor({ episodeId: "u03-mina", unlocked: new Set(["mina"]) })).toBeNull();
  });

  test("MC2-U15. 표에 없는 에피소드면 null 이다", () => {
    expect(characterUnlockFor({ episodeId: "u02-hotel", unlocked: new Set() })).toBeNull();
    expect(characterUnlockFor({ episodeId: "", unlocked: new Set() })).toBeNull();
  });

  test("MC2-U15. 다른 인물이 열려 있어도 미나 판정에는 영향이 없다", () => {
    expect(characterUnlockFor({ episodeId: "u03-mina", unlocked: new Set(["clerk"]) })).toEqual(
      MINA,
    );
  });

  test("MC2-U15. 표를 주입하면 그 표로 판정한다 — 줄 둘", () => {
    const clerk: CharacterUnlockEntry = {
      episodeId: "u04-clerk",
      characterId: "clerk",
      roomId: "clerk",
      sceneImagePath: "content/images/u04-clerk/pre-1.webp",
      faceImagePath: "content/images/profiles/clerk.webp",
    };
    const table = [MINA, clerk];
    expect(characterUnlockFor({ episodeId: "u04-clerk", unlocked: new Set(), table })).toEqual(
      clerk,
    );
    expect(
      characterUnlockFor({ episodeId: "u04-clerk", unlocked: new Set(["clerk"]), table }),
    ).toBeNull();
    expect(characterUnlockFor({ episodeId: "u03-mina", unlocked: new Set(), table })).toEqual(MINA);
    // 주입한 표가 기본 표를 대신한다.
    expect(
      characterUnlockFor({ episodeId: "u03-mina", unlocked: new Set(), table: [clerk] }),
    ).toBeNull();
  });

  test("MC2-U15. CHARACTER_UNLOCKS 는 해금 JSON의 네 인물(정윤경 u01 · 미나 u03 · 한도윤 u12 · 서재민 u17 — ADR-0141)이다", () => {
    expect(CHARACTER_UNLOCKS[1]).toEqual(MINA);
    expect(CHARACTER_UNLOCKS.map((entry) => [entry.episodeId, entry.characterId])).toEqual([
      ["u01-water", "yoonkyung"],
      ["u03-mina", "mina"],
      ["u12-cafe-missed", "doyun"],
      ["u17-samgyeopsal", "jaemin"],
    ]);
  });

  test("MC2-U15. CHARACTER_UNLOCKS 의 그림 경로는 content 경로 꼴이고 characterId 는 유일하다", () => {
    const ids = CHARACTER_UNLOCKS.map((entry) => entry.characterId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of CHARACTER_UNLOCKS) {
      expect(entry.sceneImagePath).toMatch(/^content\/images\/[^/]+\/.+\.webp$/);
      expect(entry.faceImagePath).toMatch(/^content\/images\/profiles\/.+\.webp$/);
      expect(entry.roomId).toBe(entry.characterId);
    }
  });
});

describe("newFriendReducer (MC2-U16)", () => {
  const table: readonly (readonly [NewFriendPhase, NewFriendEvent, NewFriendPhase])[] = [
    ["waiting", "appear", "typing"],
    ["waiting", "typed", "waiting"],
    ["waiting", "dismiss", "closed"],
    ["typing", "appear", "typing"],
    ["typing", "typed", "message"],
    ["typing", "dismiss", "closed"],
    ["message", "appear", "message"],
    ["message", "typed", "message"],
    ["message", "dismiss", "closed"],
    ["closed", "appear", "closed"],
    ["closed", "typed", "closed"],
    ["closed", "dismiss", "closed"],
  ];

  test.each(table)("MC2-U16. %s + %s → %s", (phase, event, expected) => {
    expect(newFriendReducer(phase, event)).toBe(expected);
  });

  test("MC2-U16. 한 번 닫히면 어떤 사건으로도 다시 열리지 않는다", () => {
    let phase: NewFriendPhase = "closed";
    for (const event of ["appear", "typed", "appear", "typed"] as const) {
      phase = newFriendReducer(phase, event);
    }
    expect(phase).toBe("closed");
  });
});

describe("replyButtonStateOf (MC2-U16)", () => {
  test("MC2-U16. message 에서만 lit, 그 밖은 dim 이다", () => {
    expect(replyButtonStateOf("message")).toBe("lit");
    expect(replyButtonStateOf("waiting")).toBe("dim");
    expect(replyButtonStateOf("typing")).toBe("dim");
    expect(replyButtonStateOf("closed")).toBe("dim");
  });
});

describe("newFriendTimelineOf (MC2-U16)", () => {
  test("MC2-U16. 표준 — 2000 ms 뒤 등장, 1200 ms 입력 중, 얼굴 튐 · 점 깜빡임", () => {
    expect(newFriendTimelineOf("standard")).toEqual({
      appearAfterMs: 2000,
      typingMs: 1200,
      face: "bounce",
      dots: "blink",
    });
  });

  test("MC2-U16. 움직임 줄이기 — 600 ms · 600 ms, 얼굴 · 점 정지", () => {
    expect(newFriendTimelineOf("reduced")).toEqual({
      appearAfterMs: 600,
      typingMs: 600,
      face: "still",
      dots: "still",
    });
  });

  test("MC2-U16. 시간은 양의 정수 ms 다", () => {
    for (const motion of ["standard", "reduced"] as const) {
      const { appearAfterMs, typingMs } = newFriendTimelineOf(motion);
      for (const ms of [appearAfterMs, typingMs]) {
        expect(Number.isInteger(ms)).toBe(true);
        expect(ms).toBeGreaterThan(0);
      }
    }
  });

  test("MC2-U16. 시간표는 NEW_FRIEND_TIMING 상수 한 곳에서 온다", () => {
    expect(NEW_FRIEND_TIMING.standard).toEqual({ appearAfterMs: 2000, typingMs: 1200 });
    expect(NEW_FRIEND_TIMING.reduced).toEqual({ appearAfterMs: 600, typingMs: 600 });
    for (const motion of ["standard", "reduced"] as const) {
      const timeline = newFriendTimelineOf(motion);
      expect(timeline.appearAfterMs).toBe(NEW_FRIEND_TIMING[motion].appearAfterMs);
      expect(timeline.typingMs).toBe(NEW_FRIEND_TIMING[motion].typingMs);
    }
  });
});
