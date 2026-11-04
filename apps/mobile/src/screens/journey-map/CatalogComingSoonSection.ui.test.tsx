import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { CatalogComingSoonSection } from "./CatalogComingSoonSection";
import { CatalogMapSections } from "./CatalogMapSections";
import type { CatalogGate, CatalogMapSection } from "./catalog-map.contract";

// `ui` 계층: 카탈로그 맨 끝 「다음 에피소드 준비 중」 구획(시안 C1) — 마지막 구획이 열린 에피소드일 때만 그다음
// 번호로 서고, 구획 전체가 낭독 요소 하나이며 누를 수 없습니다.

afterEach(() => {
  cleanup();
});

const ready = (episodeId: string, ordinal: number): CatalogMapSection => ({
  kind: "catalog-ready",
  episodeId,
  ordinal,
  title: episodeId,
  lessonKeys: ["S1", "S2"],
  finalKey: "RP",
  completionKeys: ["RP"],
  cultureKeys: [],
});
const gate = {
  legacyTutorialPassed: true,
  progress: {},
} as unknown as CatalogGate;

function mount(sections: readonly CatalogMapSection[]) {
  const onStartCover = vi.fn<(episodeId: string) => void>();
  const onSelectUnit = vi.fn<(episodeId: string, unitKey: string, tapY: number) => void>();
  render(
    <CatalogMapSections
      sections={sections}
      gate={gate}
      onStartCover={onStartCover}
      onSelectUnit={onSelectUnit}
    />,
  );
  return { onStartCover, onSelectUnit };
}

describe("CatalogComingSoonSection", () => {
  test("CSU1. 마지막이 열린 에피소드면 그다음 번호의 준비 중 구획이 맨 끝에 서고 한 요소로 읽힌다", () => {
    mount([ready("u01", 1), ready("u02", 2), ready("u03", 3)]);

    const section = screen.getByTestId("catalog-coming-soon");
    expect(screen.getByTestId("catalog-coming-soon-label")).toHaveTextContent("Episode 4.");
    expect(screen.getByTestId("catalog-coming-soon-title")).toHaveTextContent("Coming soon");
    expect(screen.getByTestId("catalog-coming-soon-body")).toHaveTextContent(
      "We're preparing the next story.",
    );
    expect(section).toHaveAttribute("accessibility-element", "true");
    expect(section).toHaveAttribute(
      "accessibility-label",
      "Episode 4. Coming soon. We're preparing the next story.",
    );
    expect(section).not.toHaveAttribute("accessibility-traits", "button");
    const root = screen.getByTestId("journey-map-screen-catalog");
    expect(root.lastElementChild).toBe(section.parentElement);
  });

  test("CSU2. 마지막이 준비 중이거나 구획이 없으면 서지 않는다", () => {
    mount([
      ready("u01", 1),
      {
        kind: "catalog-unavailable",
        episodeId: "u02",
        ordinal: 2,
        title: "u02",
        reason: "pending",
      },
    ]);
    expect(screen.queryByTestId("catalog-coming-soon")).not.toBeInTheDocument();
    cleanup();

    mount([]);
    expect(screen.queryByTestId("catalog-coming-soon")).not.toBeInTheDocument();
  });

  test("CSU3. 눌러도 아무것도 시작하지 않는다", () => {
    const { onStartCover, onSelectUnit } = mount([ready("u01", 1)]);

    fireEvent.tap(screen.getByTestId("catalog-coming-soon"), {});
    expect(screen.getByTestId("catalog-coming-soon-label")).toHaveTextContent("Episode 2.");
    expect(onStartCover).not.toHaveBeenCalled();
    expect(onSelectUnit).not.toHaveBeenCalled();
  });
});

// ⟨2026-11-04⟩ 받는 중인 편의 카드는 눌러서 받기 시트를 엽니다(ADR-0095 D6 · D7). 맨 끝 카드는 누를 수 없습니다.
test("CS-TAP1. 받는 중인 편 카드는 onTap이 있으면 버튼으로 읽히고, 누르면 그 id로 부른다", () => {
  const onTap = vi.fn();
  render(<CatalogComingSoonSection ordinal={11} episodeId="u11" onTap={onTap} />);
  const card = screen.getByTestId("catalog-pending-u11");
  expect(card).toHaveAttribute("accessibility-traits", "button");
  fireEvent.tap(card, {});
  expect(onTap).toHaveBeenCalledWith("u11");
});

test("CS-TAP2. 맨 끝 카드 · onTap이 없는 카드는 누를 수 없다", () => {
  const onTap = vi.fn();
  const { unmount } = render(<CatalogComingSoonSection ordinal={12} onTap={onTap} />);
  fireEvent.tap(screen.getByTestId("catalog-coming-soon"), {});
  expect(onTap).not.toHaveBeenCalled();
  expect(screen.getByTestId("catalog-coming-soon")).not.toHaveAttribute("accessibility-traits");
  unmount();
  render(<CatalogComingSoonSection ordinal={11} episodeId="u11" />);
  expect(screen.getByTestId("catalog-pending-u11")).not.toHaveAttribute("accessibility-traits");
});

// ⟨2026-11-04⟩ 맨 끝 카드의 두 상태(ADR-0095 D9) — 오래 확인 못 함: 「새 이야기가 있을 수 있어요」 + 확인 버튼,
// 최근에 확인함: 지금 문구 + 확인한 날.
test("CS-F1. 오래 확인 못 했으면 새 이야기 안내와 확인 버튼이 서고, 누르면 onCheckNew를 부른다", () => {
  const onCheckNew = vi.fn();
  render(
    <CatalogComingSoonSection
      ordinal={12}
      freshness={{ stale: true, daysAgo: 5 }}
      onCheckNew={onCheckNew}
    />,
  );
  expect(screen.getByTestId("catalog-coming-soon-title")).toHaveTextContent(
    "New stories may be waiting",
  );
  fireEvent.tap(
    within(screen.getByTestId("catalog-coming-soon-check")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(onCheckNew).toHaveBeenCalledTimes(1);
});

test("CS-F2. 최근에 확인했으면 지금 문구에 확인한 날이 붙고 버튼이 없다", () => {
  const { unmount } = render(
    <CatalogComingSoonSection ordinal={12} freshness={{ stale: false, daysAgo: 0 }} />,
  );
  expect(screen.getByTestId("catalog-coming-soon-title")).toHaveTextContent("Coming soon");
  expect(screen.getByTestId("catalog-coming-soon-checked")).toHaveTextContent("Checked today");
  expect(screen.queryByTestId("catalog-coming-soon-check")).not.toBeInTheDocument();
  unmount();
  render(<CatalogComingSoonSection ordinal={12} freshness={{ stale: false, daysAgo: 2 }} />);
  expect(screen.getByTestId("catalog-coming-soon-checked")).toHaveTextContent("Checked 2 days ago");
});

test("CS-F3. 신선도를 모르면(넘기지 않으면) 지금 그대로다", () => {
  render(<CatalogComingSoonSection ordinal={12} />);
  expect(screen.getByTestId("catalog-coming-soon-title")).toHaveTextContent("Coming soon");
  expect(screen.queryByTestId("catalog-coming-soon-checked")).not.toBeInTheDocument();
  expect(screen.queryByTestId("catalog-coming-soon-check")).not.toBeInTheDocument();
});
