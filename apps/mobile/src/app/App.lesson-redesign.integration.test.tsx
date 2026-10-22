import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { isTypedAnswerCorrect } from "../lib/hangul-keyboard";
import { catalogFinalPlanOf } from "./catalog-final-model";
import type { CatalogRoleplayTurn } from "./catalog-final-model";
import { bootItemAudioApp, lessonPlanWith } from "./test-helpers/item-audio-harness";
import {
  boot,
  lessonPlan,
  resetApp,
  sentenceChipId,
  tapButtonIn,
  tapCheck,
  tapChoice,
  tapId,
  tapNode,
  u01,
  u02,
  u03,
} from "./test-helpers/episode-format-harness";
import { solveActivity, solveLesson } from "./test-helpers/episode-format-solvers";

// `integration` 계층: 학습 문항 리디자인이 앱 전체 트리에서 이어지는지 봅니다 — 줄 배치와 Check, 문화 확인
// 장면과 해설 판, 상대 아바타 그림, 로마자 참고 줄, 문항 판정 측정 이벤트. 대역은 경계뿐입니다
// (`NativeModules` · `fetch` · env · 창 크기). 계획 · 화면 · 결선은 실물입니다.
//
// 내장 u00에는 상대 아바타 키가 없어, 이 파일은 u00 본문에 그 키만 더한 사본을 내장본 자리에 둡니다
// (데이터 파일은 바꾸지 않습니다).

vi.mock("../lib/episode-bundled", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/episode-bundled")>();
  const u00 = original.bundledCatalogInput.episodes["u00-tutorial"] as Record<string, unknown>;
  return {
    ...original,
    bundledCatalogInput: {
      ...original.bundledCatalogInput,
      episodes: {
        ...original.bundledCatalogInput.episodes,
        "u00-tutorial": { ...u00, counterpart_avatar: "images/avatars/u00.webp" },
      },
    },
  };
});

afterEach(() => {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
  resetApp();
});

const u00 = "u00-tutorial";
const keysThrough = (last: number): string[] => [
  "intro",
  ...Array.from({ length: last }, (_, index) => `S${index + 1}`),
];
const full = ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"];
const AVATAR_PATH = "images/avatars/u00.webp";
const AVATAR_FILE = `file:///c/${AVATAR_PATH}`;

const present = (id: string): boolean => screen.queryByTestId(id) !== null;
const attr = (id: string, name: string): string | null => screen.getByTestId(id).getAttribute(name);
const checkButton = (): HTMLElement =>
  within(screen.getByTestId("sentence-order-check")).getByTestId("ui-lynx-button");

type AnsweredEvent = {
  readonly name: string;
  readonly itemId: string;
  readonly itemType: string;
  readonly result: string;
  readonly density: string;
};
const answeredEvents = (events: readonly { readonly name: string }[]): AnsweredEvent[] =>
  events.filter((event) => event.name === "episode_item_answered") as unknown as AnsweredEvent[];

const SCORED_TYPES: ReadonlySet<string> = new Set([
  "LISTEN_SELECT",
  "MIN_PAIR_AB",
  "IMG_MATCH",
  "CLOZE",
  "CLOZE_CHOICE",
  "REPLY_SELECT",
  "ROLE_LINE",
  "TRANSLATE_TO_EN",
  "PARTICLE_FILL",
  "PARTICLE_SWAP",
  "CULTURE_CHECK",
  "LISTEN_BUILD",
  "WORD_ORDER",
  "TURN_ORDER",
  "SYLLABLE_BUILD",
  "SPEAK_WORD",
]);

/** 13 mini 같은 작은 기기입니다 — 창 812 · 안전 영역 위 50 · 아래 34는 쓸 수 있는 높이 728입니다. */
function useCompactDevice(): void {
  vi.stubGlobal("SystemInfo", {
    platform: "iOS",
    pixelRatio: 3,
    pixelWidth: 1125,
    pixelHeight: 2436,
    osVersion: "17.0.2",
    enableKrypton: true,
    runtimeType: "quickjs",
    lynxSdkVersion: "3.0",
  });
  (lynx as unknown as { __globalProps: unknown }).__globalProps = {
    safeAreaInsets: { top: 50, bottom: 34, left: 0, right: 0 },
  };
}

function sentenceOrderOf(plan: ReturnType<typeof lessonPlanWith>, index = 0) {
  const activity = plan.activities[index];
  if (activity?.form !== "sentence-order") throw new Error("sentence-order 활동이 아니다");
  return activity;
}

describe("줄 배치와 Check", () => {
  test("IT1. u00 S7 듣고 만들기 — 줄이 서고 Check는 꺼져 있다가 조각을 놓으면 켜지며, 다 놓아도 저절로 채점되지 않고 Check 뒤에야 판정한다", async () => {
    await bootItemAudioApp({ progress: { [u00]: keysThrough(6) }, files: "all" });
    const question = sentenceOrderOf(lessonPlanWith(u00, "S7")).questions[0];
    if (question === undefined) throw new Error("문항 없음");

    tapNode(u00, "S7");

    expect(present("sentence-order-lines")).toBe(true);
    expect(checkButton()).toHaveAttribute("accessibility-traits", "disabled");

    const [first, ...rest] = question.answerOrder;
    if (first === undefined) throw new Error("정답 없음");
    tapId(sentenceChipId(question, first));
    expect(checkButton()).toHaveAttribute("accessibility-traits", "button");

    for (const chip of rest) tapId(sentenceChipId(question, chip));
    expect(present("answer-verdict")).toBe(false);
    expect(present("learning-shell-verdict")).toBe(false);
    expect(checkButton()).toHaveAttribute("accessibility-traits", "button");

    const checkElement = checkButton();
    tapCheck();

    expect(
      within(screen.getByTestId("learning-shell-verdict")).getByTestId("answer-verdict"),
    ).toHaveAttribute("data-result", "correct");
    for (const chip of question.answerOrder) {
      expect(attr(`sentence-order-chip-${chip}`, "data-result")).toBe("correct");
      // 정오는 색뿐 아니라 이름 접미사와 tick 아이콘으로도 갈립니다.
      expect(attr(`sentence-order-chip-${chip}`, "accessibility-label")).toMatch(/, correct$/);
      expect(screen.getByTestId(`sentence-order-chip-${chip}-mark`)).toHaveAttribute(
        "data-result",
        "correct",
      );
    }
    // Check가 Next로 바뀌어도 같은 ui-lynx Button 요소가 남아 스크린리더 초점이 보존됩니다(문구만 바뀜).
    const nextElement = within(screen.getByTestId("sentence-order-action")).getByTestId(
      "ui-lynx-button",
    );
    expect(nextElement).toBe(checkElement);
    expect(nextElement).toHaveAttribute("accessibility-label", "Next");

    tapId("learning-shell-action");
    tapId("learning-shell-action");
    expect(present("lesson-complete-screen")).toBe(true);
  });

  test("IT2. u03 WORD_ORDER — Check 전에는 로마자가 없고, 오답으로 놓고 Check하면 틀린 판정과 로마자가 선다", async () => {
    await boot({
      [u01]: full,
      [u02]: full,
      [u03]: keysThrough(6),
    });
    const plan = lessonPlan(u03, "S7");
    const last = plan.activities.at(-1);
    if (last?.form !== "sentence-order") throw new Error("S7의 끝은 문장 순서");
    const question = last.questions[0];
    if (question === undefined || question.reading === undefined) throw new Error("읽기 줄 없음");
    expect(question.reading.shown).toBe("after-check");

    tapNode(u03, "S7");
    plan.activities.slice(0, -1).forEach((activity) => solveActivity(activity, true, false));

    for (const chip of [...question.answerOrder].reverse()) {
      tapId(sentenceChipId(question, chip));
    }
    expect(present("sentence-order-reading")).toBe(false);

    tapCheck();

    expect(
      within(screen.getByTestId("learning-shell-verdict")).getByTestId("answer-verdict"),
    ).toHaveAttribute("data-result", "incorrect");
    expect(screen.getByTestId("sentence-order-reading")).toHaveTextContent(
      question.reading.romanization,
    );
  });

  test("IT2. 정답 순서로 놓고 Check하면 맞았다는 판정과 로마자가 선다", async () => {
    await boot({
      [u01]: full,
      [u02]: full,
      [u03]: keysThrough(6),
    });
    const plan = lessonPlan(u03, "S7");
    const last = plan.activities.at(-1);
    if (last?.form !== "sentence-order") throw new Error("S7의 끝은 문장 순서");
    const question = last.questions[0];
    if (question === undefined || question.reading === undefined) throw new Error("읽기 줄 없음");

    tapNode(u03, "S7");
    plan.activities.slice(0, -1).forEach((activity) => solveActivity(activity, true, false));
    for (const chip of question.answerOrder) tapId(sentenceChipId(question, chip));
    expect(present("sentence-order-reading")).toBe(false);
    tapCheck();

    expect(attr("answer-verdict", "data-result")).toBe("correct");
    expect(screen.getByTestId("sentence-order-reading")).toHaveTextContent(
      question.reading.romanization,
    );
  });
});

describe("문화 확인", () => {
  test("IT3. u00 S13 — 앞 단계 카드의 장면 그림과 상대 말풍선이 서고, 정답이면 해설 판이 서며 Continue로 결과까지 간다", async () => {
    await boot({ [u00]: keysThrough(12) });

    tapNode(u00, "S13");

    expect(present("word-choice-culture-scene")).toBe(true);
    expect(screen.getByTestId("word-choice-culture-scene-image").getAttribute("src")).toMatch(
      /cult-u00-jalhasineyo/,
    );
    expect(screen.getByTestId("ui-lynx-chat-bubble-annotation-romanization")).toHaveTextContent(
      "hangugeo jalhasineyo!",
    );

    tapChoice(2);

    expect(attr("learning-shell-feedback", "data-tone")).toBe("correct");
    expect(screen.getByTestId("learning-shell-feedback")).toHaveTextContent("Nice reply!");
    expect(present("learning-shell-advance")).toBe(false);

    tapId("learning-shell-action");
    tapId("learning-shell-action");
    expect(present("lesson-complete-screen")).toBe(true);
  });

  test("IT4. u01 CULT — 주제 제목 카드는 장면이 없어 질문 카드로 서고 오답에도 해설 판이 선다", async () => {
    await boot({ [u01]: keysThrough(8) });
    const plan = lessonPlan(u01, "CULT");
    const cards = plan.activities.find((activity) => activity.form === "culture-card");
    const checks = plan.activities.find((activity) => activity.form === "word-choice");
    if (cards === undefined || checks?.form !== "word-choice") throw new Error("CULT 모양 불일치");

    tapNode(u01, "CULT");
    solveActivity(cards, true, false);

    expect(present("word-choice-screen-content")).toBe(true);
    expect(present("word-choice-culture-scene")).toBe(false);
    expect(present("word-choice-screen-prompt")).toBe(true);

    const question = checks.questions[0];
    if (question === undefined) throw new Error("문화 확인 문항 없음");
    tapChoice(question.answerIndex === 0 ? 1 : 0);

    expect(attr("learning-shell-feedback", "data-tone")).toBe("incorrect");
    expect(present("learning-shell-advance")).toBe(false);
    tapId("learning-shell-action");
    expect(present("word-choice-screen-content")).toBe(true);
  });
});

describe("상대 아바타 그림", () => {
  const bootAvatar = (imageFiles: readonly string[]) =>
    bootItemAudioApp({ progress: { [u00]: keysThrough(10) }, files: "all", imageFiles });

  test("IT5. 받은 파일이 있으면 S11 상대 아바타가 그 파일 주소로 선다", async () => {
    await bootAvatar([AVATAR_PATH]);

    tapNode(u00, "S11");

    const box = screen.getByTestId("sentence-order-dialogue-avatar-0");
    expect(within(box).getByTestId("ui-lynx-avatar-image").getAttribute("src")).toBe(AVATAR_FILE);
  });

  test("IT6. 받은 파일이 없으면 원격 주소로 그리고, 그림이 실패하면 상대 이름의 머리글자로 선다", async () => {
    await bootAvatar([]);
    tapNode(u00, "S11");

    const box = screen.getByTestId("sentence-order-dialogue-avatar-0");
    const image = within(box).getByTestId("ui-lynx-avatar-image");
    expect(image.getAttribute("src") ?? "").toMatch(/^https:\/\/.*images\/avatars\/u00\.webp$/);
    fireEvent(image, new window.Event("bindEvent:error"));

    expect(within(box).getByTestId("ui-lynx-avatar-initials")).toBeInTheDocument();
  });
});

describe("문항 판정 측정", () => {
  test("IT7. 레슨 하나를 풀면 채점 문항마다 이벤트가 한 번씩 계획 순서대로 나간다", async () => {
    const { events } = await boot({ [u01]: ["intro", "S1", "S2"] });
    const plan = lessonPlan(u01, "S3");
    const expected = (plan.itemRefs ?? [])
      .flat()
      .filter((ref) => SCORED_TYPES.has(ref.itemType))
      .map((ref) => ({ itemId: ref.itemId, itemType: ref.itemType }));
    expect(expected.length).toBeGreaterThan(5);

    tapNode(u01, "S3");
    solveLesson(plan, true);

    const answered = answeredEvents(events);
    expect(answered.map((event) => ({ itemId: event.itemId, itemType: event.itemType }))).toEqual(
      expected,
    );
    expect(answered.every((event) => event.result === "correct")).toBe(true);
    expect(answered.every((event) => ["regular", "compact"].includes(event.density))).toBe(true);
  });

  test("IT7. 듣기 문항은 유형 이벤트와 듣기 속도 이벤트를 둘 다 낸다", async () => {
    const booted = await bootItemAudioApp({ progress: { [u00]: keysThrough(1) } });

    tapNode(u00, "S2");
    tapChoice(1);

    expect(answeredEvents(booted.events)).toEqual([
      {
        name: "episode_item_answered",
        episodeId: u00,
        unitKey: "S2",
        itemId: "S2-01",
        itemType: "LISTEN_SELECT",
        result: "correct",
        density: "regular",
      },
    ]);
    expect(
      booted.events.filter((event) => event.name === "episode_listen_item_answered"),
    ).toHaveLength(1);
  });

  test("IT7. 작은 기기에서는 밀도가 compact로 실린다", async () => {
    useCompactDevice();
    const booted = await bootItemAudioApp({ progress: { [u00]: keysThrough(1) } });

    tapNode(u00, "S2");
    tapChoice(1);

    expect(answeredEvents(booted.events).map((event) => event.density)).toEqual(["compact"]);
  });

  test("IT7. 두 번 눌러도 문항당 한 번만 나간다", async () => {
    const booted = await bootItemAudioApp({ progress: { [u00]: keysThrough(1) } });

    tapNode(u00, "S2");
    tapChoice(1);
    tapChoice(1);
    tapChoice(0);

    expect(answeredEvents(booted.events)).toHaveLength(1);
  });
});

describe("듣고 고르기 로마자 참고 줄", () => {
  test("IT8. u00 S2는 처음에 한글 없이 구분선 아래 로마자만 보이고, 답하면 한글이 선다", async () => {
    await bootItemAudioApp({ progress: { [u00]: keysThrough(1) } });

    tapNode(u00, "S2");

    expect(present("listening-prompt-divider")).toBe(true);
    expect(present("listening-prompt-text")).toBe(false);
    expect(screen.getByTestId("listening-prompt-romanization")).toHaveTextContent(
      "jinjjayo? gamsahamnida!",
    );

    tapChoice(1);

    expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent("진짜요? 감사합니다!");
    expect(screen.getAllByTestId("listening-prompt-romanization")).toHaveLength(1);
  });
});

describe("최종 테스트 가드", () => {
  function correctPlacement(turn: CatalogRoleplayTurn): number[] {
    const count = turn.tiles.length;
    const search = (placed: number[]): number[] | null => {
      if (placed.length === count) {
        const typed = placed.map((index) => turn.tiles[index]?.ko ?? "").join(" ");
        return turn.accepted.some((answer) => isTypedAnswerCorrect(typed, answer)) ? placed : null;
      }
      for (let index = 0; index < count; index += 1) {
        if (placed.includes(index)) continue;
        const found = search([...placed, index]);
        if (found !== null) return found;
      }
      return null;
    };
    const found = search([]);
    if (found === null) throw new Error(`no placement: ${turn.id}`);
    return found;
  }

  test("IT9. 최종 테스트 첫 턴을 틀리면 오답 배지와 정답 상자가 서고 정답 문장이 보인다", async () => {
    await boot({ [u01]: full.slice(0, -1) });
    const catalog = buildEpisodeCatalog({
      bundled: bundledCatalogInput,
      cache: { manifest: null, episodes: {} },
    });
    const entry = catalog.find((candidate) => candidate.id === u01);
    if (entry === undefined || entry.status !== "ready") throw new Error("u01 not ready");
    const turn = catalogFinalPlanOf(
      entry,
      1,
      (text) => text,
      (path) => path,
    ).turns[0];
    if (turn === undefined) throw new Error("최종 테스트 턴 없음");

    tapNode(u01, "RP");
    for (const tile of [...correctPlacement(turn)].reverse()) {
      tapId(`sentence-order-chip-${tile}`);
    }
    tapButtonIn("catalog-final-screen-action");

    expect(attr("answer-verdict", "data-result")).toBe("incorrect");
    expect(screen.getByTestId("catalog-final-screen-answer")).toHaveTextContent(
      turn.accepted[0] ?? "",
    );
  });
});
