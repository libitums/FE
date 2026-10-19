import { cleanup, render, screen } from "@lynx-js/react/testing-library";
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
        episodeLabel="Episode 1, unit 02"
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
      "Episode 1, unit 02, Cosmetic., 3 of 8 units completed",
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

  // spec §19 H-1: 위에서 아래로 설명 줄 -> 제목 -> 진행 줄입니다.
  test("HU1. 설명 줄 -> 제목 -> 진행 줄 순서로 그린다", () => {
    render(
      <EpisodeHeader
        episodeLabel="Episode 0, unit 03"
        title="Tutorial."
        completedUnitCount={2}
        totalUnitCount={8}
      />,
    );

    const label = screen.getByTestId("ui-lynx-episode-header-label");
    const title = screen.getByTestId("ui-lynx-episode-header-title");
    const track = screen.getByTestId("ui-lynx-episode-header-track");
    const count = screen.getByTestId("ui-lynx-episode-header-count");
    const before = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(label.compareDocumentPosition(title) & before).toBeTruthy();
    expect(title.compareDocumentPosition(track) & before).toBeTruthy();
    expect(track.compareDocumentPosition(count) & before).toBeTruthy();
    expect(label).toHaveTextContent("Episode 0, unit 03");
  });

  test("HU2. 설명 줄은 episodeLabel을 그대로 그린다 (마침표를 더하거나 떼지 않는다)", () => {
    render(
      <EpisodeHeader
        episodeLabel="Episode 2, unit 02"
        title="Cosmetic."
        completedUnitCount={1}
        totalUnitCount={8}
      />,
    );

    expect(screen.getByTestId("ui-lynx-episode-header-label").textContent).toBe(
      "Episode 2, unit 02",
    );
  });

  test("HU3. 별을 그리지 않는다 (채움이 있어도)", () => {
    const { container } = render(
      <EpisodeHeader
        episodeLabel="Episode 0, unit 03"
        title="Tutorial."
        completedUnitCount={4}
        totalUnitCount={8}
      />,
    );

    expect(screen.getByTestId("ui-lynx-episode-header-fill")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("EpisodeHeader progressEntrance", () => {
  function header(completed: number, progressEntrance?: "none" | "fill") {
    return (
      <EpisodeHeader
        episodeLabel="Episode 1, unit 02"
        title="Cosmetic."
        completedUnitCount={completed}
        totalUnitCount={10}
        {...(progressEntrance === undefined ? {} : { progressEntrance })}
      />
    );
  }
  const fill = (): HTMLElement => screen.getByTestId("ui-lynx-episode-header-fill");
  const sheen = (): HTMLElement | null => screen.queryByTestId("ui-lynx-episode-header-fill-sheen");

  test.each([undefined, "none"] as const)(
    "EH2. progressEntrance가 %s이면 채움 DOM이 지금 그대로다 (클래스 정확히, 자식 0)",
    (value) => {
      render(header(3, value));

      expect(fill().getAttribute("class")).toBe("ui-lynx-episode-header-fill");
      expect(fill().children).toHaveLength(0);
      expect(sheen()).not.toBeInTheDocument();
    },
  );

  test("EH3. fill이면 채움에 등장 클래스가 붙고 빛 자식이 하나 서며, 접근성 속성은 없다", () => {
    render(header(3, "fill"));

    expect(fill().getAttribute("class")).toContain("ui-lynx-episode-header-fill-enter");
    expect(fill().children).toHaveLength(1);
    expect(sheen()?.getAttribute("class")).toBe("ui-lynx-episode-header-fill-sheen");
    expect(sheen()?.parentElement).toBe(fill());
    for (const element of [fill(), sheen()]) {
      const names = Array.from(element?.attributes ?? []).map((attribute) => attribute.name);
      expect(names.filter((name) => name.startsWith("accessibility-"))).toEqual([]);
    }
  });

  test("EH4. fill이어도 0 / 10이면 채움도 빛도 없고, 루트 접근성 이름은 세 경우 모두 같은 문자열이다", () => {
    render(header(0, "fill"));
    expect(screen.queryByTestId("ui-lynx-episode-header-fill")).not.toBeInTheDocument();
    expect(sheen()).not.toBeInTheDocument();
    const entering = screen
      .getByTestId("ui-lynx-episode-header")
      .getAttribute("accessibility-label");
    cleanup();

    render(header(0, "none"));
    const plain = screen.getByTestId("ui-lynx-episode-header").getAttribute("accessibility-label");
    cleanup();
    render(header(0));
    const absent = screen.getByTestId("ui-lynx-episode-header").getAttribute("accessibility-label");

    expect(entering).toBe(plain);
    expect(absent).toBe(plain);
  });
});
