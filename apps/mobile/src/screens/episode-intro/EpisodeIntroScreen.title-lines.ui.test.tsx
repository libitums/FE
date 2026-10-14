import { expect, test, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { EpisodeIntroScreen } from "./EpisodeIntroScreen";

// `ui` 계층: 선택 prop `titleLines` — 줄을 주면 줄마다 글자 하나, 낭독 이름은 줄을 공백으로 이은 한 줄.
// 주지 않으면 지금과 같은 한 덩어리입니다.

function renderIntro(titleLines?: readonly [string, ...string[]]) {
  render(
    <EpisodeIntroScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      label="Episode 1."
      title="익선 게스트하우스 여성 도미토리"
      titleLines={titleLines}
      onBack={vi.fn<() => void>()}
      onSkip={vi.fn<() => void>()}
      onNext={vi.fn<() => void>()}
    />,
  );
}

test("[TL1] titleLines를 주면 줄마다 title 글자 하나가 순서대로 선다", () => {
  renderIntro(["익선 게스트하우스", "여성 도미토리"]);

  const lines = screen.getAllByTestId("episode-intro-screen-title");
  expect(lines.map((line) => line.textContent)).toEqual(["익선 게스트하우스", "여성 도미토리"]);
});

test("[TL2] 머리말의 낭독 이름은 첫 줄 + 줄을 공백으로 이은 한 줄이다", () => {
  renderIntro(["익선 게스트하우스", "여성 도미토리"]);

  expect(screen.getByTestId("episode-intro-screen-heading")).toHaveAttribute(
    "accessibility-label",
    "Episode 1. 익선 게스트하우스 여성 도미토리",
  );
});

test("[TL3] titleLines를 주지 않으면 지금처럼 title 한 덩어리 글자 하나다", () => {
  renderIntro(undefined);

  const lines = screen.getAllByTestId("episode-intro-screen-title");
  expect(lines).toHaveLength(1);
  expect(lines[0]).toHaveTextContent("익선 게스트하우스 여성 도미토리");
  expect(screen.getByTestId("episode-intro-screen-heading")).toHaveAttribute(
    "accessibility-label",
    "Episode 1. 익선 게스트하우스 여성 도미토리",
  );
});

test("[TL4] 줄이 하나뿐이어도 글자 하나로 선다", () => {
  renderIntro(["Water"]);

  const lines = screen.getAllByTestId("episode-intro-screen-title");
  expect(lines.map((line) => line.textContent)).toEqual(["Water"]);
  expect(screen.getByTestId("episode-intro-screen-heading")).toHaveAttribute(
    "accessibility-label",
    "Episode 1. Water",
  );
});
