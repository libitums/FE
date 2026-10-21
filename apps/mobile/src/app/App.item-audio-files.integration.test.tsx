import { afterEach, describe, expect, test } from "vitest";
import { screen } from "@lynx-js/react/testing-library";

import { bootItemAudioApp, lessonPlanWith } from "./test-helpers/item-audio-harness";
import { resetApp, tapId, tapNode } from "./test-helpers/episode-format-harness";

// `integration` 계층: 학습 문항 음성은 기기에 받아 둔 파일만 소리가 됩니다(V4-1~V4-4). 받은 파일이 없는 첫 설치에서
// 내장 u00은 소리 없는 계획과 같은 모양이 되고(재생 조작 · 재생 호출 없음) LISTEN_BUILD는 건너뛰며, 받은 기기에서는
// 듣기 + 「천천히」가 섭니다. 대역은 경계뿐입니다(`NativeModules` · `fetch` · env). 계획 · 화면 · 결선은 실물입니다.

afterEach(resetApp);

const u00 = "u00-tutorial";
const afterS1 = { [u00]: ["intro", "S1"] };
const afterS6 = { [u00]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6"] };
const D04_FILE = "file:///c/audio/u00-tutorial/d-04.m4a";

const present = (id: string): boolean => screen.queryByTestId(id) !== null;

describe("받은 파일이 없는 부팅", () => {
  test("AF1. u00 S2는 소리 없는 계획과 같은 모양이고 듣기 재생 조작도 재생 호출도 없다", async () => {
    const { host, events } = await bootItemAudioApp({ progress: afterS1, files: "none" });
    const mute = lessonPlanWith(u00, "S2", false);

    tapNode(u00, "S2");

    expect(events.find((event) => event.name === "episode_lesson_started")).toMatchObject({
      questionCount: String(mute.questionCount),
      skippedItemCount: String(mute.skippedItemCount),
    });
    expect(present("listening-prompt-playback")).toBe(false);
    expect(present("listening-prompt-replay")).toBe(false);
    expect(host.play).not.toHaveBeenCalled();
    expect(host.playAtRate).not.toHaveBeenCalled();
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
