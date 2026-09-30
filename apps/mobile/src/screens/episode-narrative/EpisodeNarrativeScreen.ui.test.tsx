import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { EpisodeNarrativeScreen } from "./EpisodeNarrativeScreen";
import type { EpisodeNarrative } from "./episode-narrative";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

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

test("[ENS1] 제목 · 첫 장면의 화자 · 대사 · 번역을 그리고, 제목은 header다", () => {
  render(<EpisodeNarrativeScreen {...fixture()} />);

  const title = screen.getByTestId("episode-narrative-screen-title");
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

  advance();
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
  fireEvent.tap(screen.getByTestId("ui-lynx-visual-novel-dialog"), { eventType: "catchEvent" });
  expect(line()).toHaveTextContent("둘째 대사");
  expect(onFinish).not.toHaveBeenCalled();
});

test("[ENS6] 넘기기 층은 스스로 탭을 받아(스크린리더 두 번 탭) 한 장면만 넘긴다", () => {
  render(<EpisodeNarrativeScreen {...fixture()} />);

  fireEvent.tap(screen.getByTestId("episode-narrative-screen-advance"), {
    eventType: "catchEvent",
  });

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

  fireEvent.tap(screen.getByTestId("ui-lynx-visual-novel-dialog"), { eventType: "catchEvent" });
  expect(line()).toHaveTextContent("골목을 걷는다");
  expect(screen.getByTestId("narrative-background-image")).toHaveAttribute("src", "street.jpg");
});
