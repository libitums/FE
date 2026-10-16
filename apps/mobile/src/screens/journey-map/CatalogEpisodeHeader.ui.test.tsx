import { describe, expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { CatalogEpisodeHeader } from "./CatalogEpisodeHeader";
import type { CatalogMapSection } from "./catalog-map.contract";

// `ui` 계층: 카탈로그 머리 카드 — 준비된 에피소드는 진행 막대가 있는 `EpisodeHeader`, 아닌 것은
// 번호 · 이름 두 줄. 진행 수 계산은 순수 함수 unit이 지므로 여기서는 렌더된 값만 봅니다.

const lessonKeys = ["S1", "S3", "S4", "S5", "S6", "S7", "S8", "S9"];

const readyWater: CatalogMapSection = {
  kind: "catalog-ready",
  episodeId: "u01-water",
  ordinal: 1,
  title: "익선동 골목 어귀 편의점",
  lessonKeys,
  finalKey: "RP",
  completionKeys: ["RP"],
};

const longTitle = "익선 게스트하우스 여성 도미토리";

describe("CatalogEpisodeHeader", () => {
  test("UH1. 준비된 에피소드는 번호 · 제목 · 진행 1 / 10을 EpisodeHeader로 낸다", () => {
    render(<CatalogEpisodeHeader section={readyWater} progress={{ "u01-water": ["intro"] }} />);

    expect(screen.getByTestId("ui-lynx-episode-header-label")).toHaveTextContent("Episode 1.");
    expect(screen.getByTestId("ui-lynx-episode-header")).toHaveAttribute(
      "accessibility-label",
      "Episode 1. 익선동 골목 어귀 편의점, 1 of 10 units completed",
    );
    expect(screen.getByTestId("ui-lynx-episode-header-count")).toHaveTextContent("1 / 10");
    expect(screen.getByTestId("ui-lynx-episode-header")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
  });

  test("UH1b. 진행이 없으면 0 / 10이고 채움을 그리지 않는다", () => {
    render(<CatalogEpisodeHeader section={readyWater} progress={{}} />);

    expect(screen.getByTestId("ui-lynx-episode-header-count")).toHaveTextContent("0 / 10");
    expect(screen.queryByTestId("ui-lynx-episode-header-fill")).not.toBeInTheDocument();
  });

  test("UH1c. 긴 제목은 두 줄로 들어가고 각 줄은 띄어쓰기 경계이며 compact 표지가 선다", () => {
    const { container } = render(
      <CatalogEpisodeHeader
        section={{ ...readyWater, episodeId: "u03-mina", ordinal: 3, title: longTitle }}
        progress={{}}
      />,
    );

    const rendered = Array.from(
      container.querySelectorAll('[data-testid^="ui-lynx-episode-header-title-line-"]'),
    ).map((element) => element.textContent ?? "");
    expect(rendered).toHaveLength(2);
    expect(rendered.join(" ")).toBe(longTitle);
    const titleWords = longTitle.split(" ");
    for (const line of rendered) {
      const lineWords = line.split(" ");
      expect(titleWords.join(" ")).toContain(line);
      expect(lineWords.every((word) => titleWords.includes(word))).toBe(true);
    }
    expect(container.querySelector('[data-title-size="compact"]')).not.toBeNull();
    expect(container.querySelector("[data-title-fit]")).toBeNull();
  });

  test("UH1d. 한 줄 한도 안의 제목은 두 줄이고 compact 표지가 없다", () => {
    const { container } = render(<CatalogEpisodeHeader section={readyWater} progress={{}} />);

    const rendered = Array.from(
      container.querySelectorAll('[data-testid^="ui-lynx-episode-header-title-line-"]'),
    ).map((element) => element.textContent ?? "");
    expect(rendered).toEqual(["익선동 골목", "어귀 편의점"]);
    expect(container.querySelector('[data-title-size="compact"]')).toBeNull();
  });

  test("UH2. 본문이 없는 에피소드는 번호 · 제목 두 줄이고 진행 막대가 없다", () => {
    render(
      <CatalogEpisodeHeader
        section={{
          kind: "catalog-unavailable",
          episodeId: "u04-x",
          ordinal: 4,
          title: "Ep",
          reason: "pending",
        }}
        progress={{}}
      />,
    );

    const header = screen.getByTestId("catalog-header-unavailable");
    expect(header).toHaveTextContent("Episode 4.");
    expect(header).toHaveTextContent("Ep");
    expect(screen.queryByTestId("ui-lynx-episode-header")).not.toBeInTheDocument();
  });
});
