import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../lib/back-handler";
import type { CatalogCutView, CatalogCuts } from "../screens/catalog-cover/catalog-cover.contract";
import { EPISODE_BANNER_HOLD_MS } from "../screens/catalog-cover/episode-banner";
import { CatalogCoverFlow, CatalogEpilogueFlow } from "./CatalogCutsFlow";

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void) => string>(),
  stopAudio: vi.fn<() => void>(),
}));
vi.mock("../lib/audio", () => audio);
const { playAudio, stopAudio } = audio;

// `ui` 계층: 흐름 컴포넌트가 걸음마다 화면을 갈아 끼우고, 걸음이 바뀔 때만 콜백을 부른다.
// 관찰은 자식 화면의 testid로만 합니다. 시간은 가짜 타이머로 밉니다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };

const views: readonly CatalogCutView[] = [
  {
    kind: "narration",
    index: 0,
    text: { ko: "점원이 웃는다.", en: "The clerk smiles.", roman: "jeomwoni unneunda." },
    imageUrl: null,
  },
  {
    kind: "line",
    voice: "speech",
    index: 1,
    speaker: { kind: "named", name: "점원" },
    text: { ko: "또 오세요.", en: "Come again.", roman: "tto oseyo." },
    aside: null,
    imageUrl: null,
  },
];

function cutsOf(list: readonly CatalogCutView[]): CatalogCuts {
  const [first, ...rest] = list;
  if (first === undefined) {
    throw new Error("컷이 하나는 있어야 합니다");
  }
  return [first, ...rest];
}

beforeEach(() => {
  vi.useFakeTimers();
  playAudio.mockReset();
  stopAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function mountCover(
  overrides: { readonly title?: string; readonly list?: readonly CatalogCutView[] } = {},
) {
  const calls: string[] = [];
  const props = {
    onSkip: vi.fn<() => void>(() => calls.push("skip")),
    onContinue: vi.fn<() => void>(() => calls.push("continue")),
    onExit: vi.fn<(stage: "intro" | "prologue") => void>(() => calls.push("exit")),
    onCutsDone: vi.fn<() => void>(() => calls.push("cutsDone")),
    onClose: vi.fn<() => void>(() => calls.push("close")),
  };
  const bannerInsets = { top: 7, bottom: 8, left: 9, right: 10 };
  render(
    <CatalogCoverFlow
      insets={bannerInsets}
      ordinal={1}
      title={overrides.title ?? "Water"}
      cuts={cutsOf(overrides.list ?? views)}
      {...props}
    />,
  );
  return { ...props, calls, bannerInsets };
}

function mountEpilogue(list: readonly CatalogCutView[] = views) {
  const props = {
    onExit: vi.fn<() => void>(),
    onClose: vi.fn<() => void>(),
  };
  render(<CatalogEpilogueFlow insets={insets} ordinal={1} cuts={cutsOf(list)} {...props} />);
  return props;
}

const has = (testId: string) => screen.queryByTestId(testId) !== null;
const introButton = (which: "next" | "skip" | "back") =>
  within(screen.getByTestId(`episode-intro-screen-${which}`)).getByTestId(
    which === "back" ? "ui-lynx-round-button" : "ui-lynx-button",
  );
const tapIntro = (which: "next" | "skip" | "back") => fireEvent.tap(introButton(which), {});
const dialogAction = (id: "skip" | "stay") =>
  within(screen.getByTestId(`ui-lynx-dialog-action-${id}`)).getByTestId("ui-lynx-button");
const settle = () =>
  act(() => {
    vi.advanceTimersByTime(5000);
  });
const tapCutNext = () =>
  fireEvent.tap(
    within(screen.getByTestId("catalog-cover-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
const tapCutBack = () =>
  fireEvent.tap(
    within(screen.getByTestId("catalog-cover-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
// 마지막 컷의 버튼까지 누릅니다 — 끝나면 컷 화면이 사라지므로 남은 반복은 건너뜁니다.
const readAllCuts = () => {
  // 컷이 서 있는 동안에만 시간을 보냅니다 — 배너가 선 뒤에 보내면 유지 시간이 지나 배너가 닫힙니다.
  for (let i = 0; i < views.length + 1 && has("catalog-cover-screen"); i += 1) {
    settle();
    if (has("catalog-cover-screen-next")) tapCutNext();
  }
};
const holdBanner = () =>
  act(() => {
    vi.advanceTimersByTime(EPISODE_BANNER_HOLD_MS);
  });

describe("CatalogCoverFlow", () => {
  test("[UF1] 첫 렌더는 표지 하나만 서고 콜백은 없다", () => {
    const props = mountCover({ title: "Water" });

    expect(has("episode-intro-screen")).toBe(true);
    expect(has("catalog-cover-screen")).toBe(false);
    expect(has("episode-banner-screen")).toBe(false);
    expect(screen.getByTestId("episode-intro-screen-label")).toHaveTextContent("Episode 1.");
    expect(screen.getByTestId("episode-intro-screen-title")).toHaveTextContent("Water");
    for (const callback of [
      props.onSkip,
      props.onContinue,
      props.onExit,
      props.onCutsDone,
      props.onClose,
    ]) {
      expect(callback).toHaveBeenCalledTimes(0);
    }
  });

  test("[UF1b] 표지에는 그림이 있는 첫 컷의 그림이 깔리고, 그림 있는 컷이 없으면 깔리지 않는다", () => {
    const [narration, line] = views;
    mountCover({
      list: [
        { ...narration!, imageUrl: null },
        { ...line!, imageUrl: "https://cdn/pre-2.jpg" },
        { ...line!, index: 2, imageUrl: "https://cdn/pre-3.jpg" },
      ],
    });
    expect(screen.getByTestId("narrative-background").querySelector("image")).toHaveAttribute(
      "src",
      "https://cdn/pre-2.jpg",
    );
    cleanup();

    mountCover();
    expect(screen.queryByTestId("narrative-background")).not.toBeInTheDocument();
  });

  test("[UF2] Next는 onContinue 한 번과 함께 컷으로 넘어가고, 같은 틱 연타도 한 번이다", () => {
    const props = mountCover();

    act(() => {
      tapIntro("next");
      tapIntro("next");
    });

    expect(props.onContinue).toHaveBeenCalledTimes(1);
    expect(has("catalog-cover-screen")).toBe(true);
    expect(has("episode-intro-screen")).toBe(false);
  });

  test("[UF3a] Skip의 계속 보기는 콜백 없이 표지에 남는다", () => {
    const props = mountCover();

    tapIntro("skip");
    fireEvent.tap(dialogAction("stay"), {});

    expect(has("episode-intro-screen")).toBe(true);
    for (const callback of [props.onSkip, props.onContinue, props.onExit, props.onCutsDone]) {
      expect(callback).toHaveBeenCalledTimes(0);
    }
  });

  test("[UF3c] 카탈로그 표지의 확인 모달은 다시 볼 수 있다고 말한다", () => {
    mountCover();

    tapIntro("skip");

    const dialog = screen.getByTestId("episode-intro-screen-confirm");
    expect(dialog).toHaveTextContent("You can watch it again anytime from the episode intro.");
    expect(dialog).not.toHaveTextContent("won't appear again");
  });

  test("[UF3b] Skip의 건너뛰기는 onSkip 한 번만 부르고 배너도 닫힘도 없다 — 연타도 한 번", () => {
    const props = mountCover();

    tapIntro("skip");
    act(() => {
      fireEvent.tap(dialogAction("skip"), {});
      fireEvent.tap(dialogAction("skip"), {});
    });
    holdBanner();

    expect(props.onSkip).toHaveBeenCalledTimes(1);
    expect(props.onCutsDone).toHaveBeenCalledTimes(0);
    expect(props.onClose).toHaveBeenCalledTimes(0);
    expect(has("episode-banner-screen")).toBe(false);
  });

  test("[UF4] 컷 끝: onCutsDone 한 번, 닫힘은 아직 없고 시작 배너가 컷 화면 대신 선다", () => {
    const props = mountCover();
    tapIntro("next");

    readAllCuts();

    expect(props.onCutsDone).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(0);
    expect(screen.getByTestId("episode-banner-screen")).toHaveAttribute("data-kind", "start");
    expect(screen.getByTestId("episode-banner-screen-text")).toHaveTextContent("Episode start!");
    expect(has("catalog-cover-screen")).toBe(false);
    expect(has("episode-intro-screen")).toBe(false);
  });

  test("[UF5a] 배너가 유지 시간 뒤 onClose를 한 번 부른다(onCutsDone 다음)", () => {
    const props = mountCover();
    tapIntro("next");
    readAllCuts();

    holdBanner();

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.calls).toEqual(["continue", "cutsDone", "close"]);
  });

  test("[UF5b] 배너를 탭해도 onClose는 한 번이고 배너에 준 insets가 선다", () => {
    const props = mountCover();
    tapIntro("next");
    readAllCuts();

    const { style } = screen.getByTestId("episode-banner-screen-safe") as HTMLElement;
    expect(style.paddingTop).toBe("7px");
    expect(style.paddingBottom).toBe("8px");
    expect(style.paddingLeft).toBe("9px");
    expect(style.paddingRight).toBe("10px");

    fireEvent.tap(screen.getByTestId("episode-banner-screen"), {});
    holdBanner();

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  test("[UF6a] 표지의 뒤로는 onExit('intro') 한 번이고 다른 콜백 · 배너는 없다 — 다시 눌러도 한 번", () => {
    const props = mountCover();

    act(() => {
      tapIntro("back");
      tapIntro("back");
    });

    expect(props.onExit).toHaveBeenCalledExactlyOnceWith("intro");
    expect(props.onCutsDone).toHaveBeenCalledTimes(0);
    expect(props.onClose).toHaveBeenCalledTimes(0);
    expect(has("episode-banner-screen")).toBe(false);
  });

  test("[UF6b] 컷의 나가기는 onExit('prologue') 한 번이고 배너는 없다 — 다시 눌러도 한 번", () => {
    const props = mountCover();
    tapIntro("next");

    act(() => {
      tapCutBack();
      tapCutBack();
    });
    holdBanner();

    expect(props.onExit).toHaveBeenCalledExactlyOnceWith("prologue");
    expect(props.onCutsDone).toHaveBeenCalledTimes(0);
    expect(props.onClose).toHaveBeenCalledTimes(0);
    expect(has("episode-banner-screen")).toBe(false);
  });

  test("[UF9] 긴 에피소드 이름은 줄로 나뉘어 표지에 서고 머리말 낭독은 전체 이름을 지킨다", () => {
    const title = "익선 게스트하우스 여성 도미토리";
    mountCover({ title });

    const lines = screen.getAllByTestId("episode-intro-screen-title");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.map((line) => line.textContent).join(" ")).toBe(title);
    expect(screen.getByTestId("episode-intro-screen-heading")).toHaveAttribute(
      "accessibility-label",
      `Episode 1. ${title}`,
    );
  });
});

describe("CatalogEpilogueFlow", () => {
  test("[UF7] 컷에서 시작해 끝나면 클리어 배너가 서고, 닫힘은 유지 시간 뒤 한 번이다", () => {
    const props = mountEpilogue();

    expect(has("catalog-cover-screen")).toBe(true);
    expect(has("episode-intro-screen")).toBe(false);
    settle();
    tapCutNext();
    settle();
    expect(screen.getByTestId("catalog-cover-screen-next")).toHaveAttribute(
      "accessibility-label",
      "Finish episode",
    );

    readAllCuts();

    expect(screen.getByTestId("episode-banner-screen")).toHaveAttribute("data-kind", "clear");
    expect(screen.getByTestId("episode-banner-screen-text")).toHaveTextContent("Episode clear!");
    expect(props.onClose).toHaveBeenCalledTimes(0);

    holdBanner();

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onExit).toHaveBeenCalledTimes(0);
  });

  test("[UF8] 컷의 나가기는 onExit 한 번이고 배너도 닫힘도 없다", () => {
    const props = mountEpilogue();

    act(() => {
      tapCutBack();
      tapCutBack();
    });
    holdBanner();

    expect(props.onExit).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(0);
    expect(has("episode-banner-screen")).toBe(false);
  });
});

describe("컷 흐름의 음성", () => {
  const lastCutAudio = "https://cdn/audio/u01-water/pre-3.m4a";
  const soundLast: readonly CatalogCutView[] = [
    views[0] as CatalogCutView,
    { ...(views[1] as CatalogCutView), audioSource: lastCutAudio },
  ];

  test("[UFL1a] 표지 · Skip 모달 동안 소리가 없고, 마지막 컷의 소리는 배너가 서며 멈추고 배너 동안 다시 나지 않는다", () => {
    mountCover({ list: soundLast });

    expect(playAudio).toHaveBeenCalledTimes(0);
    tapIntro("skip");
    fireEvent.tap(dialogAction("stay"), {});
    expect(playAudio).toHaveBeenCalledTimes(0);
    expect(stopAudio).toHaveBeenCalledTimes(0);

    tapIntro("next");
    settle();
    tapCutNext();
    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledWith(lastCutAudio, expect.any(Function));

    settle();
    tapCutNext();
    const stopsAtBanner = stopAudio.mock.calls.length;
    holdBanner();

    expect(has("episode-banner-screen")).toBe(true);
    expect(stopsAtBanner).toBeGreaterThanOrEqual(1);
    expect(playAudio).toHaveBeenCalledTimes(1);
  });

  test("[UFL1b] 통과 뒤 컷 흐름도 마지막 컷의 소리를 배너가 서며 멈추고 배너 동안 다시 내지 않는다", () => {
    mountEpilogue(soundLast);
    expect(playAudio).toHaveBeenCalledTimes(0);

    settle();
    tapCutNext();
    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledWith(lastCutAudio, expect.any(Function));

    settle();
    tapCutNext();
    const stopsAtBanner = stopAudio.mock.calls.length;
    holdBanner();

    expect(has("episode-banner-screen")).toBe(true);
    expect(stopsAtBanner).toBeGreaterThanOrEqual(1);
    expect(playAudio).toHaveBeenCalledTimes(1);
  });
});
