import { afterEach, describe, expect, test, vi } from "vitest";
import { screen } from "@lynx-js/react/testing-library";

import type { CatalogActivity, CatalogLessonPlan } from "./catalog-lesson-plan";
import { withItemAudioIds } from "./test-helpers/item-audio-content";
import {
  audioSourceOf,
  bootItemAudioApp,
  itemAudioUrl,
  lessonPlanWith,
} from "./test-helpers/item-audio-harness";
import type { ItemAudioBooted } from "./test-helpers/item-audio-harness";
import {
  contentIdOf,
  exitResult,
  resetApp,
  tapButtonIn,
  tapId,
  tapNode,
} from "./test-helpers/episode-format-harness";
import { solveActivity, solveLesson } from "./test-helpers/episode-format-solvers";

// 내장 u01에는 문항 음성 주소가 없어, 같은 구조에 문항마다 음성 id를 싣은 사본으로 갈아 끼웁니다.
vi.mock("../lib/episode-bundled", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/episode-bundled")>();
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

// `integration` 계층: 내장 u01의 문항 음성이 레슨 route를 지나며 호스트 재생 모듈에 닿는 경로 — 속도 `play` /
// `playAtRate`, 「천천히」 상태의 레슨 수명, 소리 없는 호스트 · 옛 호스트, 정답 뒤 재생, 문장 순서 듣기,
// 측정 이벤트. 대역은 경계뿐입니다(`NativeModules` · `fetch` · env). 계획 · 화면 · 결선은 실물입니다.

afterEach(resetApp);

const u01 = "u01-water";
const afterS1 = { [u01]: ["intro", "S1"] };
const afterS4 = { [u01]: ["intro", "S1", "S2", "S3", "S4"] };
const throughCult = {
  [u01]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT"],
};

const present = (id: string): boolean => screen.queryByTestId(id) !== null;
const dataState = (id: string): string | null => screen.getByTestId(id).getAttribute("data-state");
const leaveLesson = (): void => {
  tapId("learning-shell-exit");
  tapButtonIn("ui-lynx-dialog-action-leave");
};
const answered = (booted: ItemAudioBooted) =>
  booted.events.filter((event) => (event.name as string) === "episode_listen_item_answered");

type Form = CatalogActivity["form"];

/** `form`의 첫 활동 앞까지 모두 정답으로 풀고 그 활동의 순번을 돌려줍니다. */
function solveUntil(plan: CatalogLessonPlan, form: Form): number {
  const at = plan.activities.findIndex((activity) => activity.form === form);
  if (at < 0) throw new Error(`활동이 없다: ${form}`);
  plan.activities.slice(0, at).forEach((activity) => solveActivity(activity, true, false));
  expect(screen.getByTestId(contentIdOf[form])).toBeInTheDocument();
  return at;
}

function questionOf(plan: CatalogLessonPlan, activityIndex: number, questionIndex = 0): object {
  const question = plan.activities[activityIndex]?.questions[questionIndex];
  if (question === undefined) throw new Error("문항이 없다");
  return question;
}

describe("재생 경로 — 속도", () => {
  test("IT1. 듣기가 든 레슨을 시작하면 첫 듣기 문항이 1.0 play를 인자 둘로 한 번 부른다", async () => {
    const { host } = await bootItemAudioApp({ progress: afterS1 });

    tapNode(u01, "S2");

    expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
    expect(host.play).toHaveBeenCalledTimes(1);
    expect(host.play).toHaveBeenCalledWith(itemAudioUrl(u01, "S2-01"), expect.any(Function));
    expect(host.play.mock.calls[0]).toHaveLength(2);
    expect(host.playAtRate).not.toHaveBeenCalled();
  });

  test("IT2. 다시 듣기는 같은 주소로 1.0 play를 한 번 더 부른다", async () => {
    const { host } = await bootItemAudioApp({ progress: afterS1 });
    tapNode(u01, "S2");

    tapId("listening-prompt-replay");

    expect(host.play).toHaveBeenCalledTimes(2);
    expect(host.play.mock.calls[1]?.[0]).toBe(itemAudioUrl(u01, "S2-01"));
    expect(host.play.mock.calls[1]).toHaveLength(2);
    expect(host.playAtRate).not.toHaveBeenCalled();
  });

  test("IT3. 「천천히」를 켜면 playAtRate(주소, 0.85, 함수)가 한 번이고 토글이 on이다", async () => {
    const { host } = await bootItemAudioApp({ progress: afterS1 });
    tapNode(u01, "S2");
    expect(dataState("listening-prompt-slow")).toBe("off");

    tapId("listening-prompt-slow");

    expect(host.playAtRate).toHaveBeenCalledTimes(1);
    expect(host.playAtRate).toHaveBeenCalledWith(
      itemAudioUrl(u01, "S2-01"),
      0.85,
      expect.any(Function),
    );
    expect(host.play).toHaveBeenCalledTimes(1);
    expect(dataState("listening-prompt-slow")).toBe("on");
  });

  test("IT4. 다른 활동 route로 넘어간 뒤의 듣기 문항도 0.85로 자동 재생되고 토글이 on이다", async () => {
    const { host } = await bootItemAudioApp({ progress: afterS1 });
    const plan = lessonPlanWith(u01, "S2");
    expect(plan.activities.map((activity) => activity.form).slice(0, 4)).toEqual([
      "listening",
      "sentence-order",
      "listening",
      "word-choice",
    ]);
    tapNode(u01, "S2");
    tapId("listening-prompt-slow");

    solveActivity(plan.activities[0] as CatalogActivity, true, false);
    solveActivity(plan.activities[1] as CatalogActivity, true, false);

    expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
    expect(host.playAtRate).toHaveBeenLastCalledWith(
      itemAudioUrl(u01, "S2-03"),
      0.85,
      expect.any(Function),
    );
    expect(dataState("listening-prompt-slow")).toBe("on");

    solveActivity(plan.activities[2] as CatalogActivity, true, false);
    const words = plan.activities[3];
    if (words?.form !== "word-choice") throw new Error("S2 넷째 활동은 단어 선택");
    tapId(`word-choice-option-${words.questions[0].answerIndex}`);
    tapId("learning-shell-advance");

    expect(host.playAtRate).toHaveBeenLastCalledWith(
      itemAudioUrl(u01, "S2-05"),
      0.85,
      expect.any(Function),
    );
    expect(dataState("word-choice-listen-slow")).toBe("on");
  });

  test("IT5. 나가면 꺼지고 레슨을 끝낸 뒤 다음 레슨도 꺼져 있다", async () => {
    const { host } = await bootItemAudioApp({ progress: afterS1 });
    tapNode(u01, "S2");
    tapId("listening-prompt-slow");
    expect(dataState("listening-prompt-slow")).toBe("on");

    leaveLesson();
    tapNode(u01, "S2");

    expect(dataState("listening-prompt-slow")).toBe("off");
    expect(host.play).toHaveBeenCalledTimes(2);
    expect(host.play.mock.calls[1]).toHaveLength(2);
    expect(host.playAtRate).toHaveBeenCalledTimes(1);

    tapId("listening-prompt-slow");
    solveLesson(lessonPlanWith(u01, "S2"), true);
    exitResult();
    const slowCalls = host.playAtRate.mock.calls.length;
    const next = lessonPlanWith(u01, "S3");
    tapNode(u01, "S3");
    solveUntil(next, "listening");

    expect(dataState("listening-prompt-slow")).toBe("off");
    expect(host.playAtRate.mock.calls.length).toBe(slowCalls);
    expect(host.play.mock.calls.at(-1)).toHaveLength(2);
  });
});

describe("재생 모듈이 없을 때", () => {
  test("IT6. 모듈 없는 부팅은 표시 · 건너뜀 수가 소리 없는 계획과 같고 듣기는 소리 없는 제시, 단어 선택은 재생 단추 없이 글만 보인다", async () => {
    const { events, host } = await bootItemAudioApp({ progress: afterS1, host: "none" });
    const plan = lessonPlanWith(u01, "S2", false);
    tapNode(u01, "S2");

    expect(events.find((event) => event.name === "episode_lesson_started")).toMatchObject({
      questionCount: String(plan.questionCount),
      shownItemCount: String(plan.shownItemCount),
      skippedItemCount: String(plan.skippedItemCount),
    });
    expect(plan.skippedItemCount).toBe(1);
    expect(present("listening-screen-content")).toBe(true);
    expect(present("listening-prompt-playback")).toBe(false);
    solveActivity(plan.activities[0] as CatalogActivity, true, false);
    solveActivity(plan.activities[1] as CatalogActivity, true, false);
    solveActivity(plan.activities[2] as CatalogActivity, true, false);
    const words = plan.activities[3];
    if (words?.form !== "word-choice") throw new Error("S2 넷째 활동은 단어 선택");
    tapId(`word-choice-option-${words.questions[0].answerIndex}`);
    tapId("learning-shell-advance");
    expect(screen.getByTestId("word-choice-screen-prompt")).toBeInTheDocument();
    expect(present("word-choice-listen")).toBe(false);
    expect(host.play).not.toHaveBeenCalled();
  });

  test("IT6. 모듈이 없으면 S5의 받아쓰기는 꺼진 재생 단추 그대로다", async () => {
    await bootItemAudioApp({ progress: afterS4, host: "none" });
    const plan = lessonPlanWith(u01, "S5", false);
    tapNode(u01, "S5");

    solveUntil(plan, "typing");

    expect(screen.getByTestId("typing-activity-audio")).toHaveAttribute(
      "accessibility-traits",
      "disabled",
    );
    expect(present("typing-activity-listen")).toBe(false);
  });
});

describe("옛 호스트", () => {
  test("IT10. playAtRate가 없으면 어느 화면에도 slow가 없고 재생은 play다", async () => {
    const { host } = await bootItemAudioApp({ progress: afterS1, host: "legacy" });
    const plan = lessonPlanWith(u01, "S2");
    tapNode(u01, "S2");

    expect(present("listening-prompt-slow")).toBe(false);
    tapId("listening-prompt-replay");
    expect(host.play).toHaveBeenCalledTimes(2);

    solveActivity(plan.activities[0] as CatalogActivity, true, false);
    solveActivity(plan.activities[1] as CatalogActivity, true, false);
    solveActivity(plan.activities[2] as CatalogActivity, true, false);
    const words = plan.activities[3];
    if (words?.form !== "word-choice") throw new Error("S2 넷째 활동은 단어 선택");
    tapId(`word-choice-option-${words.questions[0].answerIndex}`);
    tapId("learning-shell-advance");

    expect(present("word-choice-listen-again")).toBe(true);
    expect(present("word-choice-listen-slow")).toBe(false);
    expect(host.playAtRate).not.toHaveBeenCalled();
  });
});

describe("정답 뒤 재생 · 문장 순서 듣기 · 따라 읽기", () => {
  test("IT7. WORD_ORDER는 확인 전 재생 0, 확인 뒤 play 한 번이고 playAtRate는 없다", async () => {
    const { host } = await bootItemAudioApp({
      progress: { [u01]: ["intro", "S1", "S2", "S3", "S4", "S5"] },
    });
    const plan = lessonPlanWith(u01, "S6");
    tapNode(u01, "S6");
    const at = solveUntil(plan, "sentence-order");
    const question = plan.activities[at]?.questions[0] as { answerOrder: readonly number[] };
    const source = audioSourceOf(questionOf(plan, at));
    expect(source ?? "").toMatch(/\/audio\/u01-water\/s6-\d+\.m4a$/);
    const before = host.play.mock.calls.length;

    for (const chip of question.answerOrder) tapId(`sentence-order-chip-${chip}`);
    expect(host.play.mock.calls.length).toBe(before);
    tapId("learning-shell-action");

    expect(host.play.mock.calls.length).toBe(before + 1);
    expect(host.play.mock.calls.at(-1)?.[0]).toBe(source);
    expect(host.play.mock.calls.at(-1)).toHaveLength(2);
    expect(host.playAtRate).not.toHaveBeenCalled();
    expect(present("sentence-order-listen-replay")).toBe(false);
  });

  test("IT9. LISTEN_BUILD는 문장 순서 화면으로 서고 정답 칩 순서로 놓으면 correct다", async () => {
    const { host } = await bootItemAudioApp({ progress: afterS1 });
    const plan = lessonPlanWith(u01, "S2");
    tapNode(u01, "S2");
    const at = solveUntil(plan, "sentence-order");
    expect(at).toBe(1);
    plan.activities.slice(1, 4).forEach((activity) => solveActivity(activity, true, false));
    const build = plan.activities[4];
    if (build?.form !== "sentence-order") throw new Error("S2 다섯째 활동은 문장 순서");
    expect(build.questions).toHaveLength(3);
    const first = build.questions[0];
    const listenBuild = build.questions[1];
    if (listenBuild === undefined) throw new Error("LISTEN_BUILD 문항이 없다");
    for (const chip of first.answerOrder) tapId(`sentence-order-chip-${chip}`);
    tapId("learning-shell-action");
    tapId("learning-shell-action");

    expect(present("sentence-order-listen-replay")).toBe(true);
    expect(present("sentence-order-screen-prompt")).toBe(false);
    expect(host.play.mock.calls.at(-1)?.[0]).toBe(itemAudioUrl(u01, "S2-08"));
    for (const chip of listenBuild.answerOrder) tapId(`sentence-order-chip-${chip}`);
    tapId("learning-shell-action");

    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  });

  test("IT12. SHADOW 문항이 서면 play 한 번이고 Speak는 재생 정지가 말하기 시작보다 먼저다", async () => {
    const { host } = await bootItemAudioApp({ progress: afterS4, heard: () => "안녕하세요" });
    const plan = lessonPlanWith(u01, "S5");
    tapNode(u01, "S5");
    const at = solveUntil(plan, "read-aloud");
    const source = audioSourceOf(questionOf(plan, at));

    expect(host.play.mock.calls.filter((call) => call[0] === source)).toHaveLength(1);
    host.stop.mockClear();
    host.speechStart.mockClear();
    tapId("learning-shell-action");

    expect(host.speechStart).toHaveBeenCalled();
    expect(host.stop).toHaveBeenCalled();
    expect(host.stop.mock.invocationCallOrder[0]).toBeLessThan(
      host.speechStart.mock.invocationCallOrder[0] ?? 0,
    );
  });
});

describe("회귀 · 측정", () => {
  test("IT8. 「천천히」를 켠 채 나가서 최종으로 가도 최종 재생은 play 인자 둘이고 playAtRate는 늘지 않는다", async () => {
    const { host } = await bootItemAudioApp({ progress: throughCult });
    tapNode(u01, "S2");
    tapId("listening-prompt-slow");
    expect(dataState("listening-prompt-slow")).toBe("on");
    leaveLesson();
    const slowCalls = host.playAtRate.mock.calls.length;
    const before = host.play.mock.calls.length;

    tapNode(u01, "RP");

    expect(screen.getByTestId("catalog-final-screen")).toBeInTheDocument();
    const added = host.play.mock.calls.slice(before);
    expect(added.length).toBeGreaterThan(0);
    for (const call of added) expect(call).toHaveLength(2);
    expect(host.playAtRate.mock.calls.length).toBe(slowCalls);
  });

  test("IT8. 「천천히」를 켠 채 레슨을 끝까지 풀고 바로 최종으로 가도 최종 재생은 play 인자 둘이다", async () => {
    const { host } = await bootItemAudioApp({ progress: throughCult });
    tapNode(u01, "S2");
    tapId("listening-prompt-slow");
    expect(dataState("listening-prompt-slow")).toBe("on");
    solveLesson(lessonPlanWith(u01, "S2"), true);
    exitResult();
    const slowCalls = host.playAtRate.mock.calls.length;
    const before = host.play.mock.calls.length;

    tapNode(u01, "RP");

    expect(screen.getByTestId("catalog-final-screen")).toBeInTheDocument();
    const added = host.play.mock.calls.slice(before);
    expect(added.length).toBeGreaterThan(0);
    for (const call of added) expect(call).toHaveLength(2);
    expect(host.playAtRate.mock.calls.length).toBe(slowCalls);
  });

  test("IT11. 듣기 문항 하나에 답하면 측정 이벤트가 하나 나가고 속성이 맞다", async () => {
    const booted = await bootItemAudioApp({ progress: afterS1 });
    const plan = lessonPlanWith(u01, "S2");
    const first = plan.activities[0];
    expect(first?.form).toBe("listening");
    if (first?.form !== "listening") return;
    tapNode(u01, "S2");
    tapId("listening-prompt-replay");
    tapId("listening-prompt-slow");
    expect(answered(booted)).toEqual([]);

    tapId(`listening-choice-${first.questions[0].answerIndex}`);

    expect(answered(booted)).toEqual([
      {
        name: "episode_listen_item_answered",
        episodeId: u01,
        unitKey: "S2",
        itemId: "S2-01",
        itemType: "LISTEN_SELECT",
        result: "correct",
        pace: "slow",
        slowTurnedOn: true,
        replayCount: "1",
        slowReplayCount: "0",
      },
    ]);
  });
});
