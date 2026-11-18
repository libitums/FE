import { describe, expect, test } from "vitest";

import type { ChatFriendsState } from "./chat-friends.contract";
import type { ChatBirthYear } from "./chat-source.contract";
import {
  adultAckNeeded,
  ageBandOf,
  friendAddPlan,
  friendCardsOf,
  friendProfileModel,
  friendWithdrawn,
  profileOpensFrom,
  stripFriendsOf,
  visibleFriendsOf,
} from "./companion-friends";
import { COMPANION_CHARACTERS } from "./companion-roster";

// `unit` 계층(RF-U10 ~ U19): 추천 친구의 순수 판정 — 보이는 친구(서버 ∩ 인물 표) · 추천 줄 · 성인 확인 결정표 · 프로필 모델(아홉) ·
// 프로필 진입 · 서버가 뺀 친구.

const NOW_YEAR = 2026;
const set = (year: number): ChatBirthYear => ({ kind: "set", year });
const state = (over: Partial<ChatFriendsState> = {}): ChatFriendsState => ({
  status: "ready",
  visible: [
    { id: "seoyeon", romanceTier: "open" },
    { id: "daeun", romanceTier: "standard" },
  ],
  added: [],
  adultAck: false,
  ...over,
});

describe("보이는 친구 (RF-U10 · U11)", () => {
  test("RF-U10 서버 목록 ∩ 인물 표 — 인물 표 순서, 등급은 서버 값, 모르는 id · 이야기 인물은 빠진다", () => {
    expect(
      visibleFriendsOf([
        { id: "geonwoo", romanceTier: "standard" },
        { id: "stranger", romanceTier: "open" },
        { id: "mina", romanceTier: "open" },
        { id: "seoyeon", romanceTier: "standard" },
      ]),
    ).toEqual([
      { id: "seoyeon", romanceTier: "standard" },
      { id: "geonwoo", romanceTier: "standard" },
    ]);
  });

  test("RF-U11 서버 목록을 못 받았거나(null) 비면 아무도 보이지 않는다", () => {
    expect(visibleFriendsOf(null)).toEqual([]);
    expect(visibleFriendsOf([])).toEqual([]);
  });
});

describe("추천 줄 (RF-U12 · U13)", () => {
  test("RF-U12 보이는 친구 가운데 아직 추가하지 않은 친구만 — 다 추가했거나 상태가 없으면 줄이 없다", () => {
    expect(stripFriendsOf(state()).map((f) => f.id)).toEqual(["seoyeon", "daeun"]);
    expect(stripFriendsOf(state({ added: ["seoyeon"] })).map((f) => f.id)).toEqual(["daeun"]);
    expect(stripFriendsOf(state({ added: ["seoyeon", "daeun"] }))).toEqual([]);
    expect(stripFriendsOf(state({ visible: [], status: "unavailable" }))).toEqual([]);
    expect(stripFriendsOf(null)).toEqual([]);
  });

  test("RF-U13 카드는 방이 있는 친구만 — 이름 · 출처가 푼 아바타 · 화면 언어의 직업 태그", () => {
    const rooms = [
      { roomId: "seoyeon", counterpart: { name: "차서연", avatarUrl: "u://seoyeon" } },
      { roomId: "duksu", counterpart: { name: "덕수쌤", avatarUrl: null } },
    ];
    expect(friendCardsOf(state(), rooms, "ja")).toEqual([
      {
        id: "seoyeon",
        name: "차서연",
        avatarUrl: "u://seoyeon",
        tag: "タトゥーアーティスト・イラストレーター",
      },
    ]);
  });
});

describe("성인 확인 결정표 (RF-U14 · U15)", () => {
  test("RF-U14 나이 띠 — 서버와 같은 셈(올해 − 생년 ≥ 18), 생년 없음은 모름", () => {
    expect(ageBandOf(set(2008), NOW_YEAR)).toBe("adult");
    expect(ageBandOf(set(2009), NOW_YEAR)).toBe("minor");
    expect(ageBandOf({ kind: "skipped" }, NOW_YEAR)).toBe("unknown");
    expect(ageBandOf({ kind: "unasked" }, NOW_YEAR)).toBe("unknown");
  });

  const bands: [string, ChatBirthYear][] = [
    ["adult", set(1995)],
    ["minor", set(2012)],
    ["unknown-skipped", { kind: "skipped" }],
    ["unknown-unasked", { kind: "unasked" }],
  ];
  const cases = bands.flatMap(([band, birthYear]) =>
    (["open", "standard"] as const).flatMap((tier) =>
      [false, true, null].map((adultAck) => ({ band, birthYear, tier, adultAck })),
    ),
  );
  test.each(cases)(
    "RF-U15 등급 $tier × $band × 확인 $adultAck — open · 성인 · 확인 안 함(모름 포함)일 때만 묻는다",
    ({ band, birthYear, tier, adultAck }) => {
      const expected = tier === "open" && band === "adult" && adultAck !== true;
      expect(adultAckNeeded({ tier, birthYear, adultAck, nowYear: NOW_YEAR })).toBe(expected);
    },
  );
});

describe("친구 추가 계획 (RF-U16)", () => {
  test("RF-U16 open 친구를 성인이 처음 추가하면 확인 먼저, 확인했거나 standard면 바로 추가, 줄에 없는 친구는 무동작", () => {
    const plan = (characterId: string, over: Partial<ChatFriendsState> = {}, year = 1995) =>
      friendAddPlan({ state: state(over), characterId, birthYear: set(year), nowYear: NOW_YEAR });
    expect(plan("seoyeon")).toEqual({ kind: "confirm-adult" });
    expect(plan("seoyeon", { adultAck: true })).toEqual({ kind: "add" });
    expect(plan("daeun")).toEqual({ kind: "add" });
    expect(plan("seoyeon", {}, 2012)).toEqual({ kind: "add" });
    expect(plan("seoyeon", { added: ["seoyeon"] })).toEqual({ kind: "none" });
    expect(plan("haejun")).toEqual({ kind: "none" });
    expect(
      friendAddPlan({
        state: null,
        characterId: "seoyeon",
        birthYear: set(1995),
        nowYear: NOW_YEAR,
      }),
    ).toEqual({ kind: "none" });
    expect(
      friendAddPlan({
        state: state(),
        characterId: "seoyeon",
        birthYear: { kind: "skipped" },
        nowYear: NOW_YEAR,
      }),
    ).toEqual({ kind: "add" });
  });
});

describe("프로필 시트 모델 (RF-U17 · U18)", () => {
  test("RF-U17 아홉 인물 모두 모델이 선다 — 한국어 + 화면 언어 번역, 추가 단추는 아직 추가 안 한 추천 친구만", () => {
    for (const character of COMPANION_CHARACTERS) {
      const model = friendProfileModel(character.id, { language: "vi", addable: true });
      expect(model?.name, character.id).toBe(character.name);
      expect(model?.job.ko, character.id).toBe(character.profile.job.ko);
      expect(model?.bio.ko, character.id).toBe(character.profile.bio.ko);
      expect(model?.bio.translated, character.id).not.toBe(character.profile.bio.en);
      expect(model?.mbti, character.id).toBe(character.profile.mbti);
      expect(model?.canAdd, character.id).toBe(character.kind === "friend");
    }
    expect(friendProfileModel("seoyeon", { language: "en", addable: false })?.canAdd).toBe(false);
    expect(friendProfileModel("duksu", { language: "en", addable: false })).toMatchObject({
      age: { kind: "decade", value: 30 },
      bio: { translated: "I teach Korean outdoors. I love word quizzes!" },
    });
    expect(friendProfileModel("nobody", { language: "en", addable: true })).toBeNull();
  });

  test("RF-U18 목록 줄 · 방 머리 아바타는 열린 방의 인물 표 인물만 프로필을 연다 — 잠긴 이야기 인물 · 추가 전 친구 · 연습 방은 아니다", () => {
    const room = (id: string, kind: string) => ({ access: { kind }, counterpart: { id } });
    expect(profileOpensFrom(room("mina", "open"))).toBe(true);
    expect(profileOpensFrom(room("seoyeon", "open"))).toBe(true);
    expect(profileOpensFrom(room("jaemin", "locked"))).toBe(false);
    expect(profileOpensFrom(room("seoyeon", "addable"))).toBe(false);
    expect(profileOpensFrom(room("clerk", "open"))).toBe(false);
  });
});

describe("서버가 뺀 친구 (RF-U19)", () => {
  test("RF-U19 추가했는데 서버 목록에서 빠진 친구만 대화 불가 — 목록을 못 받았으면 판정하지 않는다", () => {
    expect(friendWithdrawn("haejun", state({ added: ["haejun"] }))).toBe(true);
    expect(friendWithdrawn("seoyeon", state({ added: ["seoyeon"] }))).toBe(false);
    expect(friendWithdrawn("haejun", state())).toBe(false);
    expect(
      friendWithdrawn("haejun", state({ added: ["haejun"], status: "unavailable", visible: [] })),
    ).toBe(false);
    expect(friendWithdrawn("haejun", null)).toBe(false);
  });
});
