import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { EpisodeNarrativeScreen } from "./EpisodeNarrativeScreen";
import type { EpisodeNarrative } from "./episode-narrative";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";
import { tutorialPrologue } from "../../app/tutorial-prologue";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). testid로 질의합니다.

const narrative: EpisodeNarrative = {
  beats: [
    { speakerName: "Yuna", line: "첫 대사", translation: "First line" },
    { speakerName: "Yuna", line: "둘째 대사", translation: "Second line" },
  ],
};

function fixture(overrides: Partial<Parameters<typeof EpisodeNarrativeScreen>[0]> = {}) {
  return {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    label: "Episode 0.",
    narrative,
    onFinish: vi.fn<() => void>(),
    onExit: vi.fn<() => void>(),
    ...overrides,
  };
}

const line = () => screen.getByTestId("ui-lynx-visual-novel-dialog-line");
const advance = () => fireEvent.tap(screen.getByTestId("episode-narrative-screen-advance"), {});
const finishTyping = () =>
  act(() => {
    vi.advanceTimersByTime(1000);
  });
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("기내 안내는 알림음 뒤에 출력하고 안내 음성 길이에 맞춰 완성한다", () => {
  const announcement = tutorialPrologue.segments[4].narrative;
  render(<EpisodeNarrativeScreen {...fixture({ narrative: announcement })} />);
  act(() => {
    vi.advanceTimersByTime(2220);
  });
  expect(line().textContent?.replace(/\u200b/g, "")).toBe("");
  act(() => {
    vi.advanceTimersByTime(1700);
  });
  expect(line().textContent?.length).toBeGreaterThan(0);
  expect(line().textContent).not.toBe(announcement.beats[0].line);
  act(() => {
    vi.advanceTimersByTime(1756);
  });
  expect(line()).toHaveTextContent(announcement.beats[0].line);
});

test("출력 중 탭은 대사만 완성하고 다음 탭에서 장면을 넘긴다", () => {
  const onFinish = vi.fn<() => void>();
  render(<EpisodeNarrativeScreen {...fixture({ onFinish })} />);
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
    "data-status",
    "revealing",
  );
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-translation-block")).toHaveStyle({
    visibility: "hidden",
  });
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
    "accessibility-label",
    "Yuna: 첫 대사 First line",
  );
  act(() => {
    vi.advanceTimersByTime(35);
  });
  expect(line().textContent).toBe("첫");
  advance();
  expect(line()).toHaveTextContent("첫 대사");
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-translation")).toHaveTextContent(
    "First line",
  );
  advance();
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
    "data-status",
    "revealing",
  );
  expect(onFinish).not.toHaveBeenCalled();
  advance();
  expect(line()).toHaveTextContent("둘째 대사");
  expect(onFinish).not.toHaveBeenCalled();
  advance();
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("모션 축소에서는 대사와 번역을 즉시 표시하고 한 번 탭으로 넘긴다", () => {
  render(<EpisodeNarrativeScreen {...fixture({ reducedMotion: true })} />);
  expect(line().textContent).toBe("첫 대사");
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-continue-indicator")).not.toHaveAttribute(
    "data-motion",
  );
  advance();
  expect(line().textContent).toBe("둘째 대사");
});

test.each(["panel", "screen"])("출력 중 %s 탭도 장면을 건너뛰지 않는다", (target) => {
  render(<EpisodeNarrativeScreen {...fixture()} />);
  if (target === "panel") {
    fireEvent.tap(screen.getByTestId("ui-lynx-visual-novel-dialog"), { eventType: "catchEvent" });
  } else {
    fireEvent.tap(screen.getByTestId("episode-narrative-screen"), {});
  }
  expect(line().textContent).toBe("첫 대사");
  expect(screen.getByTestId("episode-narrative-screen-advance")).toHaveAttribute(
    "accessibility-label",
    "Next line, 1 of 2",
  );
});

test("[ENS1] 제목 · 첫 장면의 화자 · 대사 · 번역을 그리고, 제목은 header다", () => {
  render(<EpisodeNarrativeScreen {...fixture()} />);

  const title = screen.getByTestId("episode-narrative-screen-title");
  finishTyping();
  expect(title).toHaveTextContent("Episode 0.");
  expect(title).toHaveAttribute("accessibility-traits", "header");
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-speaker")).toHaveTextContent("Yuna");
  expect(line()).toHaveTextContent("첫 대사");
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-translation")).toHaveTextContent(
    "First line",
  );
});

test("[ENS2] 넘기기 층은 버튼으로 낭독되고 진행을 이름에 싣는다", () => {
  render(<EpisodeNarrativeScreen {...fixture()} />);

  const layer = screen.getByTestId("episode-narrative-screen-advance");
  expect(layer).toHaveAttribute("accessibility-traits", "button");
  expect(layer).toHaveAttribute("accessibility-label", "Next line, 1 of 2");
});

test("[ENS3] 넘기면 다음 장면이 서고, 마지막 장면에서 넘기면 onFinish 정확히 1회", () => {
  const onFinish = vi.fn<() => void>();
  render(<EpisodeNarrativeScreen {...fixture({ onFinish })} />);

  finishTyping();
  advance();
  finishTyping();
  expect(line()).toHaveTextContent("둘째 대사");
  expect(onFinish).not.toHaveBeenCalled();

  advance();
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("[ENS4] 뒤로 tap → onExit 1회, onFinish 0회", () => {
  const onExit = vi.fn<() => void>();
  const onFinish = vi.fn<() => void>();
  render(<EpisodeNarrativeScreen {...fixture({ onExit, onFinish })} />);

  fireEvent.tap(
    within(screen.getByTestId("episode-narrative-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});

test("[ENS5] 대화 패널을 눌러도 한 장면만 넘어간다", () => {
  const onFinish = vi.fn<() => void>();
  render(<EpisodeNarrativeScreen {...fixture({ onFinish })} />);

  // 패널의 넘기기는 `catchtap`에 붙습니다 — catch 이벤트로 쏩니다. 전파가 끊겨 루트가
  // 같은 탭으로 한 번 더 넘기지 않으므로 둘째 장면에 멈춥니다.
  finishTyping();
  fireEvent.tap(screen.getByTestId("ui-lynx-visual-novel-dialog"), { eventType: "catchEvent" });
  finishTyping();
  expect(line()).toHaveTextContent("둘째 대사");
  expect(onFinish).not.toHaveBeenCalled();
});

test("[ENS6] 넘기기 층은 스스로 탭을 받아(스크린리더 두 번 탭) 한 장면만 넘긴다", () => {
  render(<EpisodeNarrativeScreen {...fixture()} />);

  finishTyping();
  fireEvent.tap(screen.getByTestId("episode-narrative-screen-advance"), {
    eventType: "catchEvent",
  });

  finishTyping();
  expect(line()).toHaveTextContent("둘째 대사");
});

test("[ST4-E] 뒤로 이름이 영어다", () => {
  render(<EpisodeNarrativeScreen {...fixture()} />);

  expect(
    within(screen.getByTestId("episode-narrative-screen-back")).getByTestId("ui-lynx-round-button"),
  ).toHaveAttribute("accessibility-label", "Back to map");
});

test("[ST4-M] 문구표에서 읽는다 — 넘기기 이름 · 뒤로", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <EpisodeNarrativeScreen {...fixture()} />
    </UiCopyContext.Provider>,
  );

  expect(screen.getByTestId("episode-narrative-screen-advance")).toHaveAttribute(
    "accessibility-label",
    "⟦episodeNarrative.nextLine⟧(1, 2)",
  );
  expect(
    within(screen.getByTestId("episode-narrative-screen-back")).getByTestId("ui-lynx-round-button"),
  ).toHaveAttribute("accessibility-label", "⟦common.exitTo.journey⟧");
});

test("배경이 바뀌어도 기존 다이알로그로 독백을 그리고 인물과 화자를 숨긴다", () => {
  render(
    <EpisodeNarrativeScreen
      {...fixture({
        narrative: {
          character: null,
          beats: [
            {
              speakerName: "Me",
              variant: "narration",
              background: "airplane.jpg",
              line: "상상해 본다",
              translation: "I imagine",
            },
            {
              speakerName: "Me",
              variant: "narration",
              background: "street.jpg",
              line: "골목을 걷는다",
              translation: "I walk down a street",
            },
          ],
        },
      })}
    />,
  );

  expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
    "data-variant",
    "narration",
  );
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
    "data-surface",
    "translucent",
  );
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute("data-avatar", "off");
  expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-speaker")).not.toBeInTheDocument();
  expect(screen.getByTestId("narrative-background-image")).toHaveAttribute("src", "airplane.jpg");
  expect(screen.getByTestId("episode-narrative-screen").querySelectorAll("image")).toHaveLength(1);

  finishTyping();
  fireEvent.tap(screen.getByTestId("ui-lynx-visual-novel-dialog"), { eventType: "catchEvent" });
  finishTyping();
  expect(line()).toHaveTextContent("골목을 걷는다");
  expect(screen.getByTestId("narrative-background-image")).toHaveAttribute("src", "street.jpg");
});

test("실제 시작 유닛은 같은 기내 그림을 유지하고 골목으로 들어갈 때만 상상 전환한다", () => {
  const opening = tutorialPrologue.segments[0].narrative;
  const onFinish = vi.fn<() => void>();
  render(
    <EpisodeNarrativeScreen {...fixture({ narrative: opening, onFinish, reducedMotion: false })} />,
  );
  const cabin = screen.getByTestId("narrative-background-image");
  fireEvent(cabin, new window.Event("bindEvent:load"));
  expect(screen.getByTestId("narrative-background")).toHaveAttribute(
    "data-transition",
    "crossfade",
  );

  // 첫 탭은 독백을 완성할 뿐 배경을 바꾸지 않습니다.
  advance();
  expect(line()).toHaveTextContent(opening.beats[0].line);
  advance();
  expect(screen.getByTestId("narrative-background-image")).toBe(cabin);
  advance();
  expect(line()).toHaveTextContent(opening.beats[1].line);
  expect(screen.queryByTestId("narrative-imagination-veil")).not.toBeInTheDocument();

  advance();
  advance();
  expect(line()).toHaveTextContent(opening.beats[2].line);
  expect(screen.getByTestId("narrative-background")).toHaveAttribute(
    "data-transition",
    "imagination",
  );
  fireEvent(screen.getByTestId("narrative-background-image"), new window.Event("bindEvent:load"));
  fireEvent.animationend(screen.getByTestId("narrative-imagination-veil"), {
    params: { animation_type: "keyframe-animation", animation_name: "narrative-imagination-veil" },
  });
  expect(line()).toHaveTextContent(opening.beats[2].line);
  expect(onFinish).not.toHaveBeenCalled();
  advance();
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("시작 유닛의 움직임 감소 설정은 상상 배경과 대화 계속 표시까지 전달된다", () => {
  render(
    <EpisodeNarrativeScreen
      {...fixture({ narrative: tutorialPrologue.segments[0].narrative, reducedMotion: true })}
    />,
  );
  advance();
  advance();
  fireEvent(screen.getByTestId("narrative-background-image"), new window.Event("bindEvent:load"));
  expect(screen.getByTestId("narrative-background")).toHaveAttribute("data-transition", "none");
  expect(screen.queryByTestId("narrative-imagination-veil")).not.toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-continue-indicator")).not.toHaveAttribute(
    "data-motion",
  );
});

test("ES1: reduced Provider에서 reducedMotion prop이 없으면 대사가 즉시 서고 배경 전환과 표시가 멈춘다", () => {
  const opening = tutorialPrologue.segments[0].narrative;
  render(
    <MotionProvider motion="reduced">
      <EpisodeNarrativeScreen {...fixture({ narrative: opening })} />
    </MotionProvider>,
  );
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
    "data-reveal",
    "instant",
  );
  expect(line()).toHaveTextContent(opening.beats[0].line);
  fireEvent(screen.getByTestId("narrative-background-image"), new window.Event("bindEvent:load"));
  expect(screen.getByTestId("narrative-background")).toHaveAttribute("data-transition", "none");
  expect(screen.getByTestId("narrative-background-image")).toHaveAttribute("data-motion", "static");
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-continue-indicator")).not.toHaveAttribute(
    "data-motion",
  );
});

test("ES2: 명시한 reducedMotion={false}가 reduced Provider를 이겨 대사가 글자 단위로 진행한다", () => {
  render(
    <MotionProvider motion="reduced">
      <EpisodeNarrativeScreen {...fixture({ reducedMotion: false })} />
    </MotionProvider>,
  );
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
    "data-status",
    "revealing",
  );
  act(() => {
    vi.advanceTimersByTime(35);
  });
  expect(line().textContent).toBe("첫");
});

test("ES2: 명시한 reducedMotion={false}가 reduced Provider를 이겨 배경이 animated로 전환한다", () => {
  const opening = tutorialPrologue.segments[0].narrative;
  render(
    <MotionProvider motion="reduced">
      <EpisodeNarrativeScreen {...fixture({ narrative: opening, reducedMotion: false })} />
    </MotionProvider>,
  );
  fireEvent(screen.getByTestId("narrative-background-image"), new window.Event("bindEvent:load"));
  expect(screen.getByTestId("narrative-background")).toHaveAttribute(
    "data-transition",
    "crossfade",
  );
  expect(screen.getByTestId("narrative-background-image")).toHaveAttribute(
    "data-motion",
    "animated",
  );
});
