import { render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test } from "vitest";

import { EpisodeHeader } from "./index";

// `ui` 계층: 제목 줄 나눔 — 호출자가 띄어쓰기에서 나눈 줄을 `titleLines`로 주면 줄마다 text 하나를 그립니다.
// 안 주면 지금 모양 그대로(튜토리얼 머리)입니다. 실제 글자 크기는 호스트가 정하므로 jsdom이 보는 것은
// 줄 요소와 표지 속성뿐입니다.

const base = {
  episodeLabel: "Episode 3.",
  title: "익선 게스트하우스 여성 도미토리",
  completedUnitCount: 0,
  totalUnitCount: 10,
} as const;

const lines = ["익선 게스트하우스", "여성 도미토리"] as const;

const twoLines = { ...base, titleLines: lines, titleSize: "compact" as const };
const oneLineDefault = { ...base, titleLines: [base.title], titleSize: "default" as const };

const lineElements = (container: Element) =>
  Array.from(container.querySelectorAll('[data-testid^="ui-lynx-episode-header-title-line-"]'));

describe("EpisodeHeader titleLines", () => {
  test("TL1. titleLines를 주면 줄마다 text 하나가 순서대로 선다", () => {
    const { container } = render(<EpisodeHeader {...twoLines} />);

    const rendered = lineElements(container);
    expect(rendered).toHaveLength(2);
    expect(rendered[0]).toHaveTextContent(lines[0]);
    expect(rendered[1]).toHaveTextContent(lines[1]);
    expect(rendered[0]?.getAttribute("data-testid")).toMatch(
      /^ui-lynx-episode-header-title-line-\d+$/,
    );
    expect(rendered[0]?.getAttribute("data-testid")).not.toBe(
      rendered[1]?.getAttribute("data-testid"),
    );
  });

  test("TL2. 줄 요소는 text이고 줄마다 text-maxline 1이다", () => {
    const { container } = render(<EpisodeHeader {...twoLines} />);

    const rendered = lineElements(container);
    expect(rendered.length).toBeGreaterThan(0);
    for (const element of rendered) {
      expect(element.tagName.toLowerCase()).toBe("text");
      expect(element).toHaveAttribute("text-maxline", "1");
    }
  });

  test("TL3. titleSize compact이면 compact 표지가 서고 default이면 compact 표지가 없다", () => {
    const compact = render(<EpisodeHeader {...twoLines} />);
    expect(compact.container.querySelector('[data-title-size="compact"]')).not.toBeNull();
    compact.unmount();

    const normal = render(<EpisodeHeader {...oneLineDefault} />);
    expect(normal.container.querySelector('[data-title-size="compact"]')).toBeNull();
    expect(lineElements(normal.container)).toHaveLength(1);
  });

  test("TL4. titleLines가 없으면 제목은 text 하나이고 줄 요소도 크기 표지도 없다", () => {
    const { container } = render(<EpisodeHeader {...base} />);

    const title = screen.getByTestId("ui-lynx-episode-header-title");
    expect(title).toHaveTextContent(base.title);
    expect(title).not.toHaveAttribute("text-maxline");
    expect(lineElements(container)).toHaveLength(0);
    expect(container.querySelector("[data-title-size]")).toBeNull();
  });

  test("TL5. titleLines가 있어도 접근성 이름은 줄이 아니라 제목 전체로 읽는다", () => {
    render(<EpisodeHeader {...twoLines} />);

    expect(screen.getByTestId("ui-lynx-episode-header")).toHaveAttribute(
      "accessibility-label",
      `Episode 3. ${base.title}, 0 of 10 units completed`,
    );
    expect(screen.getByTestId("ui-lynx-episode-header-count")).toHaveTextContent("0 / 10");
  });

  test("TL6. 옛 자동 맞춤 표지는 더 이상 서지 않는다", () => {
    const { container } = render(<EpisodeHeader {...twoLines} />);

    expect(container.querySelector("[data-title-fit]")).toBeNull();
  });
});
