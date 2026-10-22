import type { SetStateAction } from "@lynx-js/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { ListenPace } from "../lib/listen-pace";
import type { ListenItemReport } from "../lib/question-audio";
import { initialSessionOptions } from "../lib/session-options";
import { catalogLessonAudioOf } from "./catalog-lesson-audio";
import { catalogListenWiring } from "./catalog-listen-wiring";
import type { CatalogListenWiring } from "./catalog-listen-wiring";

// `unit` 계층: 「천천히」 결선과 활동이 받는 LessonAudio 짓기의 입출력만 봅니다.

const report: ListenItemReport = {
  ref: { itemId: "S2-01", itemType: "LISTEN_SELECT" },
  result: "correct",
  pace: "slow",
  slowTurnedOn: true,
  replayCount: 2,
  slowReplayCount: 1,
};

function resolveAction(action: SetStateAction<ListenPace>, previous: ListenPace): ListenPace {
  return typeof action === "function" ? action(previous) : action;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("catalogListenWiring", () => {
  test("LW1. 토글은 setListenPace에 함수형 갱신을 넘겨 normal → slow → normal로 간다", () => {
    let pace: ListenPace = "normal";
    const setListenPace = vi.fn<(action: SetStateAction<ListenPace>) => void>((action) => {
      pace = resolveAction(action, pace);
    });
    const wiring = catalogListenWiring({
      listenPace: pace,
      setListenPace,
      episodeIntroEventSink: null,
    });

    wiring.onToggleListenPace();
    expect(pace).toBe("slow");
    wiring.onToggleListenPace();
    expect(pace).toBe("normal");

    expect(setListenPace).toHaveBeenCalledTimes(2);
    expect(typeof setListenPace.mock.calls[0]?.[0]).toBe("function");
  });

  test("LW1. 값은 받은 listenPace 그대로다", () => {
    const wiring = catalogListenWiring({
      listenPace: "slow",
      setListenPace: () => {},
      episodeIntroEventSink: null,
    });

    expect(wiring.listenPace).toBe("slow");
  });

  test("LW2. 문항 보고는 sink에 듣기 문항 이벤트 하나로 나간다", () => {
    const sink = vi.fn<(event: unknown) => void>();
    const wiring = catalogListenWiring({
      listenPace: "slow",
      setListenPace: () => {},
      episodeIntroEventSink: sink,
    });

    wiring.onListenItemAnswered("u01-water", "S2", report);

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith({
      name: "episode_listen_item_answered",
      episodeId: "u01-water",
      unitKey: "S2",
      itemId: "S2-01",
      itemType: "LISTEN_SELECT",
      result: "correct",
      pace: "slow",
      slowTurnedOn: true,
      replayCount: "2",
      slowReplayCount: "1",
    });
  });

  test("LW3. sink가 null이어도 던지지 않는다", () => {
    const wiring = catalogListenWiring({
      listenPace: "normal",
      setListenPace: () => {},
      episodeIntroEventSink: null,
    });

    expect(() => wiring.onListenItemAnswered("u01-water", "S2", report)).not.toThrow();
  });
});

describe("catalogLessonAudioOf", () => {
  function wiringStub() {
    const onToggleListenPace = vi.fn<() => void>();
    const onListenItemAnswered = vi.fn<CatalogListenWiring["onListenItemAnswered"]>();
    return { onToggleListenPace, onListenItemAnswered };
  }

  test.each(["normal", "slow"] as const)("LW4. 속도 %s를 그대로 낸다", (pace) => {
    const lesson = catalogLessonAudioOf(
      { listenPace: pace, ...wiringStub(), sessionOptions: initialSessionOptions },
      "u01-water",
      "S2",
    );

    expect(lesson.pace).toBe(pace);
  });

  test("LW4. 자동 재생은 세션 옵션을 따른다", () => {
    const base = { listenPace: "normal" as const, ...wiringStub() };

    expect(
      catalogLessonAudioOf({ ...base, sessionOptions: initialSessionOptions }, "u01-water", "S2")
        .autoPlay,
    ).toBe("on");
    expect(
      catalogLessonAudioOf(
        { ...base, sessionOptions: { ...initialSessionOptions, "auto-play-audio": false } },
        "u01-water",
        "S2",
      ).autoPlay,
    ).toBe("off");
  });

  test("LW4. 지원 여부는 호스트의 playAtRate 유무를 읽는다", () => {
    const args = {
      listenPace: "normal" as const,
      ...wiringStub(),
      sessionOptions: initialSessionOptions,
    };

    vi.stubGlobal("NativeModules", { AudioPlaybackModule: { play: () => {} } });
    expect(catalogLessonAudioOf(args, "u01-water", "S2").slowPlayback).toBe("unsupported");

    vi.stubGlobal("NativeModules", {
      AudioPlaybackModule: { play: () => {}, playAtRate: () => {} },
    });
    expect(catalogLessonAudioOf(args, "u01-water", "S2").slowPlayback).toBe("supported");
  });

  test("LW4. 토글과 보고는 결선으로 이어지고 보고에 에피소드 · 유닛이 붙는다", () => {
    const stub = wiringStub();
    const lesson = catalogLessonAudioOf(
      { listenPace: "normal", ...stub, sessionOptions: initialSessionOptions },
      "u01-water",
      "S4",
    );

    lesson.onTogglePace();
    lesson.onListenItemAnswered(report);

    expect(stub.onToggleListenPace).toHaveBeenCalledTimes(1);
    expect(stub.onListenItemAnswered).toHaveBeenCalledWith("u01-water", "S4", report);
  });
});
