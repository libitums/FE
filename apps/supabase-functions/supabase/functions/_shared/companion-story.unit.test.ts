import { expect, test } from "vitest";

import { chooseBranch, nextTopicState, topicStateFrom } from "./companion-branching.ts";
import { defaultLearningSettings } from "./companion-learning.ts";
import { companionSystemPrompt } from "./companion-prompt.ts";
import { beats, storyEntries } from "./companion-story-data.ts";
import {
  eligibleBeats,
  nextStoryState,
  openerBeat,
  pickStory,
  storyCardFor,
  storyConfig,
} from "./companion-story.ts";

const minaDone = ["u00-tutorial", "u01-water", "u02-checkin", "u03-mina"];

test("ST1. 카드는 끝낸 에피소드만 · 대화 처음에 모두 싣고 열린 약속을 붙인다", () => {
  const pick = pickStory("mina", minaDone, topicStateFrom(null));
  expect(pick.shown).toEqual(["u01-water", "u02-checkin", "u03-mina"]);
  expect(pick.fresh).toEqual(pick.shown);
  expect(pick.text).toContain("어, 새로 오셨나 봐요?");
  expect(pick.text).toContain("# Still open between you");
  expect(pick.text).toContain("유진식당 맛있었는지");
  expect(pick.text).not.toContain("파전");
  expect(pickStory("mina", ["u00-tutorial"], topicStateFrom(null)).text).toBeNull();
  expect(pickStory("duksu", minaDone, topicStateFrom(null)).text).toBeNull();
});

test("ST2. 처음 실은 뒤 showTurns 턴까지만 싣고, 새 에피소드를 끝내면 그것만 새 창으로", () => {
  let state = topicStateFrom(null);
  const shownTurns: number[] = [];
  for (let turn = 0; turn < 6; turn += 1) {
    const pick = pickStory("mina", minaDone, state);
    if (pick.text !== null) shownTurns.push(state.turn);
    state = nextTopicState(state, {
      userText: "네 좋아요",
      turnState: null,
      action: null,
      story: pick,
    });
  }
  expect(shownTurns).toEqual(Array.from({ length: storyConfig.showTurns }, (_, i) => i));
  const later = pickStory("mina", [...minaDone, "u13-pajeon"], state);
  expect(later.fresh).toEqual(["u13-pajeon"]);
  expect(later.shown).toEqual(["u13-pajeon"]);
  expect(later.text).toContain("파전");
  expect(later.text).not.toContain("새로 오셨나 봐요");
  expect(nextStoryState(state, later)).toMatchObject({
    storyShow: ["u13-pajeon"],
    storyShowUntil: state.turn + storyConfig.showTurns - 1,
  });
});

test("ST3. 카드는 시스템 프롬프트 뒤 부분(유저별)에 실린다 — 앞 부분 캐시를 깨지 않는다", () => {
  const prompt = companionSystemPrompt({
    persona: { name: "미나" },
    speechLevel: "polite",
    ageBand: "adult",
    l1: "en",
    expressions: [],
    summary: null,
    feedbackMode: "separate",
    memories: [],
    directive: null,
    story: storyCardFor("mina", minaDone),
  });
  expect(prompt.stable).not.toContain("What happened between you");
  expect(prompt.dynamic).toContain("# What happened between you in the story");
});

test("ST4. 비트 — 진도 구간 · 이 대화에서 안 쓴 것만, 화제 전환은 페르소나 화제보다 비트를 먼저 쓰고 쓴 비트를 기억한다", () => {
  expect(eligibleBeats("duksu", ["u00-tutorial"]).map((beat) => beat.id)).toEqual([
    "duksu-quiz",
    "duksu-first-hello",
  ]);
  expect(
    eligibleBeats("duksu", ["u00-tutorial", "u01-water", "u03-mina"]).map((beat) => beat.id),
  ).toEqual(["duksu-quiz", "duksu-water"]);
  expect(eligibleBeats("mina", minaDone, ["mina-yujin"])).toEqual([]);
  const state = { ...topicStateFrom(null), turn: 6, topic: "서울", shortStreak: 2 };
  const branch = chooseBranch(state, {
    userText: "네",
    persona: { name: "미나", topics: ["서울 맛집"] },
    learning: {
      pool: [],
      episodes: minaDone,
      settings: defaultLearningSettings,
      chipsOn: false,
      today: "2026-11-15",
    },
    random: () => 0,
    beats: eligibleBeats("mina", minaDone),
  });
  expect(branch.action).toEqual({
    kind: "switch",
    seed: expect.stringContaining("유진식당"),
    beatId: "mina-yujin",
  });
  const next = nextTopicState(state, { userText: "네", turnState: null, action: branch.action });
  expect(next.beatsUsed).toEqual(["mina-yujin"]);
});

test("ST5. 선톡 비트 — opener 가운데 가장 최근 끝낸 에피소드에 걸린 것(진도 반응)", () => {
  const done = ["u00-tutorial", "u01-water", "u02-checkin", "u13-pajeon"];
  expect(openerBeat("yoonkyung", done, () => 0)?.id).toBe("yk-bindaetteok");
  expect(openerBeat("yoonkyung", ["u00-tutorial"], () => 0)).toBeNull();
});

test("ST6. 데이터 — 비트 id는 겹치지 않고, 카드 에피소드는 캐릭터마다 한 번 · 모든 줄이 비어 있지 않다", () => {
  expect(new Set(beats.map((beat) => beat.id)).size).toBe(beats.length);
  for (const [character, entries] of Object.entries(storyEntries)) {
    expect(new Set(entries.map((entry) => entry.episode)).size, character).toBe(entries.length);
    for (const entry of entries) {
      expect(entry.lines.length).toBeGreaterThan(0);
      expect(
        entry.lines.every((line) => line.trim() !== "" && !/제작 메모|분기|u\d{2}/.test(line)),
      ).toBe(true);
    }
  }
});
