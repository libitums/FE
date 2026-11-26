import { expect, test } from "vitest";

import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { modelOfMetFriend, sheetViewOf } from "./suggested-friends-ui";
import { friend } from "./suggested-friends.test-support";

// `unit` 계층(PV-U1, ADR-0198 · 2026-11-26 보고 「Hear voice → Voice sample unavailable」): 프로필 시트가 결선에서 받는 값 — 견본 주소 ·
// 로마자 스위치. 스토리 보기의 이미 친구 시트도 이 한 함수로 같은 값을 받습니다.

const PATH = "content/audio/companion/duksu-intro.mp3";
const who = { id: "duksu", name: "덕수쌤", avatarUrl: null };
const model = modelOfMetFriend(friend("duksu", { voiceSamplePath: PATH }), who);

const port = (patch: Partial<SuggestedFriendsPort> = {}): SuggestedFriendsPort => ({
  catalog: () => ({ characters: [], categories: [] }),
  add: () => "added",
  earlyAccess: null,
  voiceSampleUrl: (path) => `https://cdn/${path.replace(/^content\//, "")}`,
  romanization: () => true,
  ...patch,
});

test("PV-U1. 견본이 있는 인물 — 포트 해석기로 푼 주소 · 스위치 켬이면 shown", () => {
  expect(sheetViewOf(model, port())).toEqual({
    voiceSampleUrl: "https://cdn/audio/companion/duksu-intro.mp3",
    romanization: "shown",
  });
});

test("PV-U1. 스위치 끔이면 hidden, 견본 없는 인물 · 해석기가 못 풀면 주소 null", () => {
  expect(sheetViewOf(model, port({ romanization: () => false })).romanization).toBe("hidden");
  const silent = modelOfMetFriend(friend("duksu"), who);
  expect(sheetViewOf(silent, port()).voiceSampleUrl).toBeNull();
  expect(sheetViewOf(model, port({ voiceSampleUrl: () => null })).voiceSampleUrl).toBeNull();
});

test("PV-U1. 포트가 없으면 주소 null · hidden", () => {
  expect(sheetViewOf(model, undefined)).toEqual({ voiceSampleUrl: null, romanization: "hidden" });
});
