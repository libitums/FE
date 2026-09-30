import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import bookmark from "@libitums/icons/lynx/bookmark";
import clapper from "@libitums/icons/lynx/clapper";

import { EpisodeIntroMapItem } from "./EpisodeIntroMapItem";

// `ui` 계층: 표지 맵 항목 하나를 고립 렌더합니다(`MessengerMapItem.ui.test.tsx`와 같은 형태).
// 줄에서의 자리 · 잠김 파생은 화면이 지므로 `JourneyMapScreen.episode-intro.ui.test.tsx`가
// 봅니다 — 여기서는 어휘 옮김과 아이콘만 봅니다.

const itemTestId = "ui-lynx-learning-unit-tutorial-intro";

// `LearningUnit`이 그린 svg의 `content`에서 칠한 색을 되돌려 원본 글리프를 꺼냅니다 —
// 아이콘 색은 상태가 정하는 것이라(`learning-unit.contract.ts`) 글리프를 비교하려면
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
      // 표식은 `LearningUnit`이 그리므로 유닛 어휘입니다 — `completed`가 `clear`,
      // 아직 하지 않은 것이 `available`입니다.
      expect(item).toHaveAttribute("data-status", status === "completed" ? "clear" : "available");
      expect(item).toHaveAttribute("accessibility-traits", "button");
      // 상태 접미사와 「이야기 연결」은 `LearningUnit`이 붙입니다(ADR-0016 D3).
      //
      // ⚠ 제목이 「에피소드 **표지**」인 것은 계약이 정한 것입니다
      // (`episode-intro.contract.ts`의 `EpisodeIntroTitle`) — 「서사」로 두면
      // 「에피소드 서사, 현재 항목, 이야기 연결」로 *서사*와 *이야기*가 한 호흡에
      // 두 번 들립니다.
      expect(item).toHaveAttribute(
        "accessibility-label",
        status === "completed" ? "Episode intro, completed, story" : "Episode intro, story",
      );
      expect(screen.getByText("Episode intro")).toBeInTheDocument();
    },
  );

  // UI-B1 — 표지는 `bookmark`를 그립니다. 계약 기본값 `clapper`를 기각한 이유가
  // **바로 이 컴포넌트 안에서** 확인됩니다: `narrative="narrative"`인 유닛의 배지가
  // 이미 `clapper`라, 아이콘까지 `clapper`면 한 표식 안에 같은 글리프가 둘 섭니다
  // (design.md §1.1). 그래서 「아이콘이 bookmark다」와 「배지와 다른 글리프다」를
  // 한 테스트가 함께 봅니다 — 둘을 가르면 한쪽만 고쳐질 자리입니다.
  it("[UI-B1] 아이콘이 bookmark이고 배지(clapper)와 다른 글리프다", () => {
    render(
      <EpisodeIntroMapItem
        id="tutorial-intro"
        title="Episode intro"
        status="available"
        onSelect={vi.fn<(id: "tutorial-intro") => void>()}
      />,
    );

    // `LearningUnit`이 넘긴 아이콘을 실제로 쓰는 것은 `available`뿐입니다 —
    // `default`는 자물쇠, `clear`는 체크를 스스로 그립니다.
    const icon = glyphOf(screen.getByTestId(`${itemTestId}-icon`));
    expect(icon).toBe(bookmark);

    const badge = screen.getByTestId(`${itemTestId}-badge`);
    const badgeGlyph = glyphOf(badge.querySelector(".ui-lynx-learning-unit-badge-icon"));
    expect(badgeGlyph).toBe(clapper);
    expect(icon).not.toBe(badgeGlyph);
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
});
