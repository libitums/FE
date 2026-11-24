import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

import type { CatalogActivity, CatalogLessonPlan } from "./catalog-lesson-plan";
import { withItemAudioIds } from "./test-helpers/item-audio-content";
import { audioSourceOf, bootItemAudioApp, lessonPlanWith } from "./test-helpers/item-audio-harness";
import type { ItemAudioBooted } from "./test-helpers/item-audio-harness";
import {
  contentIdOf,
  resetApp,
  tapButtonIn,
  tapCheck,
  tapNode,
} from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";

// 문항 음성 사본(IT 시리즈와 같은 대역) — 정답 뒤 음성과 녹음 색인이 서도록 문항마다 음성 id를 싣습니다.
vi.mock("../lib/episode-bundled", async () => {
  const original = await import("../lib/episode-bundled.test-support");
  const { bundledCatalogInput } = original;
  const episodeId = "u01-water";
  return {
    ...original,
    bundledCatalogInput: {
      ...bundledCatalogInput,
      episodes: {
        ...bundledCatalogInput.episodes,
        [episodeId]: withItemAudioIds(bundledCatalogInput.episodes[episodeId], episodeId),
      },
    },
  };
});

// `integration` 계층: 다시 듣기 · 칩 소리(ADR-0188)가 계획(녹음 색인) → 화면 → 재생 모듈 · 측정 sink까지 닿는 경로.
// 대역은 경계뿐입니다(`NativeModules` · `fetch` · env). 계획 · 화면 · 결선은 실물입니다.

afterEach(resetApp);

const u01 = "u01-water";
const UNITS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] as const;
const progressBefore = (unit: string): Record<string, string[]> => ({
  [u01]: ["intro", ...UNITS.slice(0, UNITS.indexOf(unit as (typeof UNITS)[number]))],
});

type Found = { readonly unit: string; readonly plan: CatalogLessonPlan; readonly at: number };

/** 첫 문항이 `match`를 만족하는 `form` 활동을 단원 차례대로 찾습니다. */
function findActivity(form: CatalogActivity["form"], match: (question: object) => boolean): Found {
  for (const unit of UNITS) {
    const plan = lessonPlanWith(u01, unit);
    const at = plan.activities.findIndex(
      (activity) =>
        activity.form === form &&
        activity.questions[0] !== undefined &&
        match(activity.questions[0] as object),
    );
    if (at >= 0) return { unit, plan, at };
  }
  throw new Error(`활동이 없다: ${form}`);
}

/** 그 활동 앞까지 정답으로 풉니다. */
function openActivity(found: Found): void {
  tapNode(u01, found.unit);
  found.plan.activities
    .slice(0, found.at)
    .forEach((activity) => solveActivity(activity, true, false));
  const activity = found.plan.activities[found.at];
  if (activity === undefined) throw new Error("활동이 없다");
  expect(screen.getByTestId(contentIdOf[activity.form])).toBeInTheDocument();
}

const eventsNamed = (booted: ItemAudioBooted, name: string) =>
  booted.events.filter((event) => (event.name as string) === name);
const lastPlayed = (booted: ItemAudioBooted): string | undefined => {
  const calls = booted.host.play.mock.calls;
  return calls[calls.length - 1]?.[0];
};
const advanceCut = (): void => {
  const dialog = screen.queryByTestId("ui-lynx-visual-novel-dialog");
  if (dialog?.getAttribute("data-status") === "revealing") tapButtonIn("catalog-cover-screen-next");
  tapButtonIn("catalog-cover-screen-next");
};

describe("이야기 컷 다시 듣기", () => {
  test("IR1. 소리 있는 컷의 스피커 — 그 컷 주소로 play 한 번 더 · sentence_audio_replayed(story_cut, prologue)", async () => {
    const booted = await bootItemAudioApp({ progress: { [u01]: [] } });
    fireEvent.tap(screen.getByTestId(`ui-lynx-special-unit-catalog-cover-${u01}`), {});
    tapButtonIn("episode-intro-screen-next");
    for (let cut = 0; cut < 12; cut += 1) {
      if (
        screen.getByTestId("catalog-cover-screen-replay").getAttribute("data-state") === "available"
      ) {
        break;
      }
      advanceCut();
    }
    const replay = screen.getByTestId("catalog-cover-screen-replay");
    expect(replay.getAttribute("data-state")).toBe("available");
    const autoPlayed = lastPlayed(booted);
    const before = booted.host.play.mock.calls.length;

    fireEvent.tap(within(replay).getByTestId("ui-lynx-round-button"), {});

    expect(booted.host.play.mock.calls.length).toBe(before + 1);
    expect(lastPlayed(booted)).toBe(autoPlayed);
    expect(eventsNamed(booted, "sentence_audio_replayed")).toEqual([
      { name: "sentence_audio_replayed", episodeId: u01, surface: "story_cut", stage: "prologue" },
    ]);
  });
});

describe("레슨 판정 뒤 다시 듣기", () => {
  test("IR2. 문장 조립 Check 뒤 스피커 — 정답 음성 주소로 play · sentence_audio_replayed(lesson_answer, unitKey)", async () => {
    const found = findActivity(
      "sentence-order",
      (question) => (question as { audio?: { kind?: string } }).audio?.kind === "answer-echo",
    );
    const booted = await bootItemAudioApp({ progress: progressBefore(found.unit) });
    openActivity(found);
    const activity = found.plan.activities[found.at];
    if (activity?.form !== "sentence-order") throw new Error("문장 조립이 아니다");
    const question = activity.questions[0];
    if (question === undefined) throw new Error("문항이 없다");
    for (const index of question.answerOrder) {
      fireEvent.tap(screen.getByTestId(`sentence-order-chip-${index}`), {});
    }
    tapCheck();
    const before = booted.host.play.mock.calls.length;

    const replay = screen.getByTestId("learning-shell-verdict-replay");
    fireEvent.tap(within(replay).getByTestId("ui-lynx-round-button"), {});

    expect(booted.host.play.mock.calls.slice(before).map((call) => call[0])).toEqual([
      audioSourceOf(question),
    ]);
    expect(eventsNamed(booted, "sentence_audio_replayed")).toEqual([
      {
        name: "sentence_audio_replayed",
        episodeId: u01,
        surface: "lesson_answer",
        unitKey: found.unit,
      },
    ]);
  });
});

describe("칩 소리", () => {
  test("IR3. 소리 있는 보기를 누르면 그 낱말 주소로 play · choice_chip_sound_played — 판정 이벤트는 그대로 하나", async () => {
    const found = findActivity("word-choice", (question) => {
      const audio = (question as { choiceAudio?: readonly (string | null)[] }).choiceAudio;
      return audio !== undefined && audio.some((source) => source !== null);
    });
    const booted = await bootItemAudioApp({ progress: progressBefore(found.unit) });
    openActivity(found);
    const question = found.plan.activities[found.at]?.questions[0] as {
      readonly choiceAudio: readonly (string | null)[];
    };
    const index = question.choiceAudio.findIndex((source) => source !== null);
    const picture = screen.queryByTestId("word-choice-picture-image");
    if (picture !== null) fireEvent(picture, new window.Event("bindEvent:load"));
    const before = booted.host.play.mock.calls.length;
    const answeredBefore = eventsNamed(booted, "episode_item_answered").length;

    fireEvent.tap(screen.getByTestId(`ui-lynx-option-selector-item-choice-${index}`), {});

    expect(booted.host.play.mock.calls[before]?.[0]).toBe(question.choiceAudio[index]);
    expect(eventsNamed(booted, "choice_chip_sound_played")).toEqual([
      {
        name: "choice_chip_sound_played",
        episodeId: u01,
        unitKey: found.unit,
        surface: "word_choice",
      },
    ]);
    expect(eventsNamed(booted, "episode_item_answered").length).toBe(answeredBefore + 1);
  });
});
