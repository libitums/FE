import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { FirstUnitGuideProvider } from "../../components/first-unit-guide";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { EpisodeNarrativeScreen } from "./EpisodeNarrativeScreen";
import type { EpisodeNarrative } from "./episode-narrative";

// `ui` 계층: 상태바 아이콘 표지가 서사 화면 루트(와 그 위의 첫 단원 안내)에 달리는지 봅니다
// (계약 3.2 · r02.2).

afterEach(cleanup);

const markers = () =>
  Array.from(document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`));

const withBackground: EpisodeNarrative = {
  beats: [
    {
      speakerName: "Yuna",
      line: "첫 대사",
      translation: "First line",
      background: "scene.png",
    },
  ],
};

const withoutBackground: EpisodeNarrative = {
  beats: [{ speakerName: "Yuna", line: "첫 대사", translation: "First line" }],
};

function narrativeScreen(narrative: EpisodeNarrative, guided = false) {
  return (
    <EpisodeNarrativeScreen
      guided={guided}
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      label="Episode 0."
      narrative={narrative}
      onFinish={vi.fn<() => void>()}
      onExit={vi.fn<() => void>()}
    />
  );
}

test.each([
  ["배경 지정 장면", withBackground],
  ["배경 미지정 장면", withoutBackground],
])("UT3: %s의 루트에 표지가 하나 선다", (_name, narrative) => {
  render(narrativeScreen(narrative));

  expect(markers()).toHaveLength(1);
  expect(markers()[0]).toBe(screen.getByTestId("episode-narrative-screen"));
});

test("UT12: 안내가 뜨면 표지는 화면 루트와 안내 둘이고 닫으면 화면 루트 하나다", () => {
  render(
    <FirstUnitGuideProvider enabled>
      {narrativeScreen(withoutBackground, true)}
    </FirstUnitGuideProvider>,
  );

  expect(markers()).toHaveLength(2);
  expect(markers()).toContain(screen.getByTestId("episode-narrative-screen"));
  expect(markers()).toContain(screen.getByTestId("first-unit-guide-story"));

  fireEvent.tap(screen.getByTestId("first-unit-guide-story"), { eventType: "catchEvent" });

  expect(screen.queryByTestId("first-unit-guide-story")).not.toBeInTheDocument();
  expect(markers()).toHaveLength(1);
  expect(markers()[0]).toBe(screen.getByTestId("episode-narrative-screen"));
});
