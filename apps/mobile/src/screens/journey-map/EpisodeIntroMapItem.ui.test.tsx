import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import star from "@libitums/icons/lynx/five-pointed-star";
import bookmark from "@libitums/icons/lynx/bookmark";
import clapper from "@libitums/icons/lynx/clapper";

import { EpisodeIntroMapItem } from "./EpisodeIntroMapItem";

// `ui` 계층: 표지 맵 항목 하나를 고립 렌더합니다(`MessengerMapItem.ui.test.tsx`와 같은 형태).
// 줄에서의 자리 · 잠김 파생은 화면이 지므로 `JourneyMapScreen.episode-intro.ui.test.tsx`가
// 봅니다 — 여기서는 어휘 옮김과 아이콘, 안내 말풍선만 봅니다.

const itemTestId = "ui-lynx-special-unit-tutorial-intro";

// `SpecialUnit`이 그린 svg의 `content`에서 칠한 색을 되돌려 원본 글리프를 꺼냅니다 —
// 아이콘 색은 상태가 정하는 것이라(`special-unit.contract.ts`) 글리프를 비교하려면
// 그 칠을 되돌려야 합니다. 색 상수를 이 파일에 옮겨 적지 않으려는 것이기도 합니다.
function glyphOf(node: Element | null): string {
  const content = node?.getAttribute("content") ?? "";
  const painted = node?.getAttribute("current-color") ?? "";
  return painted === "" ? content : content.split(painted).join("currentColor");
}

describe("EpisodeIntroMapItem UI", () => {
  it.each(["available", "completed"] as const)(
    "[UI-I3·UI-I6] %s 상태의 표식 · 낭독 이름 · button trait를 낸다",
    (status) => {
      render(
        <EpisodeIntroMapItem
          id="tutorial-intro"
          title="Episode intro"
          status={status}
          onSelect={vi.fn<(id: "tutorial-intro") => void>()}
        />,
      );

      const item = screen.getByTestId(itemTestId);
      // 표식은 `SpecialUnit`이 그리므로 유닛 어휘입니다 — `completed`가 `clear`,
      // 아직 하지 않은 것이 `available`입니다.
      expect(item).toHaveAttribute("data-status", status === "completed" ? "clear" : "available");
      expect(item).toHaveAttribute("accessibility-traits", "button");
      // `special, ` 접두는 맵 문구표가, 상태 접미사는 `SpecialUnit`이 붙입니다(ADR-0016 D3).
      // 「이야기 연결」(`story`) 접미사는 더는 없습니다.
      //
      // ⚠ 제목이 「에피소드 **표지**」인 것은 계약이 정한 것입니다
      // (`episode-intro.contract.ts`의 `EpisodeIntroTitle`).
      expect(item).toHaveAttribute(
        "accessibility-label",
        status === "completed" ? "special, Episode intro, completed" : "special, Episode intro",
      );
      expect(screen.getByText("Episode intro")).toBeInTheDocument();
    },
  );

  // UI-B1 — 표지도 다른 스페셜 항목과 같은 오각 별을 그립니다. 종류별 아이콘
  // (`bookmark`)과 Narrative 배지(`clapper`)는 없습니다.
  it("[UI-B1] 아이콘이 five-pointed-star이고 배지 요소가 없다", () => {
    render(
      <EpisodeIntroMapItem
        id="tutorial-intro"
        title="Episode intro"
        status="available"
        onSelect={vi.fn<(id: "tutorial-intro") => void>()}
      />,
    );

    const icon = glyphOf(screen.getByTestId(`${itemTestId}-icon`));
    expect(icon).toBe(star);
    expect(icon).not.toBe(bookmark);
    expect(icon).not.toBe(clapper);
    expect(screen.queryByTestId(`${itemTestId}-badge`)).toBeNull();
  });

  it("[UI-I5] 누르면 자기 id만 올린다", () => {
    const onSelect = vi.fn<(id: "tutorial-intro") => void>();
    render(
      <EpisodeIntroMapItem
        id="tutorial-intro"
        title="Episode intro"
        status="available"
        onSelect={onSelect}
      />,
    );

    fireEvent.tap(screen.getByTestId(itemTestId), {});

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("tutorial-intro");
  });

  // 엣지 — 계약은 표지에게 `locked`가 **오지 않는다**고 적습니다(구획의 첫 항목이라
  // 앞에 걸 것이 없습니다). 그래도 `status` 타입은 공용이라 어댑터 표에 `locked` 행이
  // 남고, 값이 오면 자물쇠로 서야 합니다. 이 줄이 「안 오는 값」을 값으로 확인합니다.
  it("[엣지] locked가 오면 자물쇠로 서고 조작할 수 없다", () => {
    const onSelect = vi.fn<(id: "tutorial-intro") => void>();
    render(
      <EpisodeIntroMapItem
        id="tutorial-intro"
        title="Episode intro"
        status="locked"
        onSelect={onSelect}
      />,
    );

    const item = screen.getByTestId(itemTestId);
    expect(item).toHaveAttribute("data-status", "default");
    expect(item).toHaveAttribute("accessibility-traits", "disabled");
    fireEvent.tap(item, {});
    expect(onSelect).not.toHaveBeenCalled();
  });

  // UI-G1 — 안내 말풍선이 뜨면 바깥 상자가 스크림 위로 들리는 겹이 되고, 말풍선도
  // 같은 가드로 서야 합니다(잠긴 표지의 말풍선이 표지를 열면 안 됩니다).
  it("[UI-G1] guided는 안내 겹과 말풍선을 내고 말풍선 탭이 onSelect를 부른다", () => {
    const onSelect = vi.fn<(id: "tutorial-intro") => void>();
    const { container } = render(
      <EpisodeIntroMapItem
        id="tutorial-intro"
        title="Episode intro"
        status="available"
        onSelect={onSelect}
        guided
      />,
    );

    expect(container.querySelector(".journey-special-unit-guided")).not.toBeNull();
    const tooltip = container.querySelector(".first-unit-map-tooltip");
    expect(tooltip).not.toBeNull();
    fireEvent.tap(tooltip as Element, {});
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("tutorial-intro");
  });

  it("[UI-G1] guided가 아니면 안내 겹도 말풍선도 없다", () => {
    const { container } = render(
      <EpisodeIntroMapItem
        id="tutorial-intro"
        title="Episode intro"
        status="available"
        onSelect={vi.fn<(id: "tutorial-intro") => void>()}
      />,
    );

    expect(container.querySelector(".journey-special-unit-guided")).toBeNull();
    expect(container.querySelector(".first-unit-map-tooltip")).toBeNull();
  });

  it("[UI-G1] locked + guided의 말풍선 탭은 onSelect를 부르지 않는다", () => {
    const onSelect = vi.fn<(id: "tutorial-intro") => void>();
    const { container } = render(
      <EpisodeIntroMapItem
        id="tutorial-intro"
        title="Episode intro"
        status="locked"
        onSelect={onSelect}
        guided
      />,
    );

    const tooltip = container.querySelector(".first-unit-map-tooltip");
    expect(tooltip).not.toBeNull();
    fireEvent.tap(tooltip as Element, {});
    expect(onSelect).not.toHaveBeenCalled();
  });
});
