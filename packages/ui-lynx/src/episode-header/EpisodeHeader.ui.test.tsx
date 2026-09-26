import { render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test } from "vitest";

import { EpisodeHeader } from "./index";

// `ui` 계층: 렌더 결과만 봅니다(ADR-0006 D4). 계산된 스타일·레이아웃은 jsdom이
// 계산하지 않으므로 여기서 단언하지 않습니다 — `toHaveClass`·`toHaveStyle`을 쓰지
// 않습니다. 다만 채움 폭은 진행 비율이라 인라인 스타일이 지고, 그 값이 맞는지는
// 계약 테스트가 봅니다.

describe("EpisodeHeader", () => {
  test("번호 · 이름 · 개수를 글자로 낸다", () => {
    render(
      <EpisodeHeader
        episodeLabel="Episode 0."
        title="Tutorial."
        completedUnitCount={7}
        totalUnitCount={20}
      />,
    );

    expect(screen.getByTestId("ui-lynx-episode-header-label")).toHaveTextContent("Episode 0.");
    expect(screen.getByTestId("ui-lynx-episode-header-title")).toHaveTextContent("Tutorial.");
    expect(screen.getByTestId("ui-lynx-episode-header-count")).toHaveTextContent("7 / 20");
  });

  // 카드 하나가 접근성 요소입니다 — 번호 · 이름 · 진행이 따로 읽히면 「7 / 20」이
  // 무엇의 7인지 잃습니다.
  test("카드가 하나의 접근성 요소이고 이름이 단위를 밝힌다", () => {
    render(
      <EpisodeHeader
        episodeLabel="Episode 1."
        title="Cosmetic."
        completedUnitCount={3}
        totalUnitCount={8}
      />,
    );

    const header = screen.getByTestId("ui-lynx-episode-header");
    expect(header).toHaveAttribute("accessibility-element", "true");
    expect(header).toHaveAttribute("accessibility-traits", "header");
    expect(header).toHaveAttribute(
      "accessibility-label",
      "Episode 1. Cosmetic., 유닛 8개 중 3개 완료",
    );
  });

  // 0%에서 채움을 그리지 않는 것이 이 컴포넌트의 분기 하나입니다. 폭 0짜리 상자를
  // 두면 그 안의 별이 잘린 채 남아 「아직 시작 안 함」이 「조금 했음」으로 읽힙니다.
  test("끝낸 유닛이 없으면 채움을 그리지 않는다", () => {
    render(
      <EpisodeHeader
        episodeLabel="Episode 0."
        title="Tutorial."
        completedUnitCount={0}
        totalUnitCount={8}
      />,
    );

    expect(screen.getByTestId("ui-lynx-episode-header-track")).toBeInTheDocument();
    expect(screen.queryByTestId("ui-lynx-episode-header-fill")).not.toBeInTheDocument();
  });

  test("끝낸 유닛이 있으면 채움을 그 비율로 그린다", () => {
    render(
      <EpisodeHeader
        episodeLabel="Episode 0."
        title="Tutorial."
        completedUnitCount={2}
        totalUnitCount={8}
      />,
    );

    expect(screen.getByTestId("ui-lynx-episode-header-fill")).toHaveAttribute(
      "style",
      expect.stringContaining("25%"),
    );
  });
});
