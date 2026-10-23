import { afterEach, describe, expect, test } from "vitest";
import { screen } from "@lynx-js/react/testing-library";

import { bootItemAudioApp } from "./test-helpers/item-audio-harness";
import type { ItemAudioBooted } from "./test-helpers/item-audio-harness";
import { resetApp, tapId, tapNode } from "./test-helpers/episode-format-harness";

// `integration` 계층: 학습 문항 음성은 기기에 받아 둔 파일만 소리가 됩니다(V4-1~V4-4). 받은 파일이 없는 첫 설치에서
// 내장 u00은 소리 없는 계획과 같은 모양이 되고(재생 조작 · 재생 호출 없음) LISTEN_BUILD는 건너뛰며, 받은 기기에서는
// 듣기 + 「천천히」가 섭니다. 대역은 경계뿐입니다(`NativeModules` · `fetch` · env). 계획 · 화면 · 결선은 실물입니다.

afterEach(resetApp);

const u00 = "u00-tutorial";
const afterS1 = { [u00]: ["intro", "S1"] };
const afterS6 = { [u00]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6"] };
const D04_FILE = "file:///c/audio/u00-tutorial/d-04.m4a";

const SENTENCE = "진짜요? 감사합니다!";
const ROMAN = "jinjjayo? gamsahamnida!";

const answered = (booted: ItemAudioBooted) =>
  booted.events.filter((event) => (event.name as string) === "episode_listen_item_answered");

const present = (id: string): boolean => screen.queryByTestId(id) !== null;

describe("받은 파일이 없는 부팅", () => {
  test("AF1. u00 S2는 소리 없는 제시로 서서 대본이 처음부터 보이고 재생 조작 · play 없이 답할 수 있다", async () => {
    const { host } = await bootItemAudioApp({ progress: afterS1, files: "none" });

    tapNode(u00, "S2");

    expect(present("listening-silent-prompt")).toBe(true);
    expect(screen.getByTestId("listening-silent-prompt-text")).toHaveTextContent(SENTENCE);
    expect(screen.getByTestId("listening-silent-prompt-romanization")).toHaveTextContent(ROMAN);
    expect(present("listening-prompt-playback")).toBe(false);
    expect(present("listening-prompt-replay")).toBe(false);
    expect(present("listening-prompt-slow")).toBe(false);
    expect(host.play).not.toHaveBeenCalled();
    expect(host.playAtRate).not.toHaveBeenCalled();
    expect(screen.getByTestId("ui-lynx-option-selector-item-choice-0")).toBeInTheDocument();

    tapId("ui-lynx-option-selector-item-choice-1");

    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
    expect(host.play).not.toHaveBeenCalled();
  });

  test("AF5. 소리 없는 제시 문항에 답해도 듣기 측정 이벤트(episode_listen_item_answered)는 나가지 않는다", async () => {
    const booted = await bootItemAudioApp({ progress: afterS1, files: "none" });
    tapNode(u00, "S2");

    tapId("ui-lynx-option-selector-item-choice-1");

    expect(answered(booted)).toEqual([]);
  });

  test("AF2. u00 S7의 LISTEN_BUILD는 건너뛰어 표시 0 · 건너뜀 1이다", async () => {
    const { events } = await bootItemAudioApp({ progress: afterS6, files: "none" });

    tapNode(u00, "S7");

    expect(events.find((event) => event.name === "episode_lesson_started")).toMatchObject({
      questionCount: "0",
      shownItemCount: "0",
      skippedItemCount: "1",
    });
    expect(present("sentence-order-listen-replay")).toBe(false);
  });
});

describe("받은 파일이 있는 부팅", () => {
  test("AF3. u00 S2 듣기 문항은 받은 파일 주소로 재생하고 「천천히」가 0.85로 같은 파일을 부른다", async () => {
    const { host } = await bootItemAudioApp({ progress: afterS1, files: "all" });

    tapNode(u00, "S2");

    expect(present("listening-prompt-playback")).toBe(true);
    expect(host.play).toHaveBeenCalledWith(D04_FILE, expect.any(Function));
    tapId("listening-prompt-slow");
    expect(host.playAtRate).toHaveBeenCalledWith(D04_FILE, 0.85, expect.any(Function));
  });

  test("AF6. 받은 파일이 있는 기기에서는 같은 문항에 답하면 듣기 측정 이벤트가 하나 나간다(AF5의 가드)", async () => {
    const booted = await bootItemAudioApp({ progress: afterS1, files: "all" });
    tapNode(u00, "S2");

    tapId("ui-lynx-option-selector-item-choice-1");

    expect(answered(booted)).toHaveLength(1);
  });

  test("AF4. u00 S7의 LISTEN_BUILD가 서서 표시 1 · 건너뜀 0이다", async () => {
    const { events } = await bootItemAudioApp({ progress: afterS6, files: "all" });

    tapNode(u00, "S7");

    expect(events.find((event) => event.name === "episode_lesson_started")).toMatchObject({
      questionCount: "1",
      shownItemCount: "1",
      skippedItemCount: "0",
    });
    expect(present("sentence-order-listen-replay")).toBe(true);
  });
});
