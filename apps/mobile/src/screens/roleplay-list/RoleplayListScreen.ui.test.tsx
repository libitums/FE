import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { RoleplayItem, RoleplaySection } from "./roleplay-list.contract";
import { RoleplayListScreen } from "./RoleplayListScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 구획은 이 파일 안의 fixture로
// 줍니다 — 어느 에피소드가 열렸는지는 화면이 정하지 않고 받습니다. `toHaveClass`·
// `toHaveStyle`을 쓰지 않습니다. 텍스트 질의(`getByText`)를 쓰지 않습니다.

const messengerItem: RoleplayItem = {
  form: "messenger",
  unitId: "appointment-confirmation",
  title: "약속 확인 메시지",
};

const phoneCallItem: RoleplayItem = {
  form: "phone-call",
  unitId: "appointment-confirmation-phone-call",
  title: "약속 확인 전화",
};

const visualNovelItem: RoleplayItem = {
  form: "visual-novel",
  unitId: "cafe-arrival-visual-novel",
  title: "카페에 도착한 지민",
};

const openSection: RoleplaySection = {
  episodeId: "tutorial",
  label: "Episode 0.",
  title: "Tutorial.",
  unlocked: true,
  items: [messengerItem, phoneCallItem],
};

const lockedSection: RoleplaySection = {
  episodeId: "cafe",
  label: "Episode 1.",
  title: "Cafe.",
  unlocked: false,
  items: [visualNovelItem],
};

const sections: readonly RoleplaySection[] = [openSection, lockedSection];

function renderScreen(
  overrides: Partial<Parameters<typeof RoleplayListScreen>[0]> = {},
): ReturnType<typeof render> {
  return render(
    <RoleplayListScreen
      sections={sections}
      onSelectItem={vi.fn()}
      onViewAll={vi.fn()}
      {...overrides}
    />,
  );
}

function attributeNames(element: HTMLElement): readonly string[] {
  return Array.from(element.attributes).map((attribute) => attribute.name);
}

test("롤플레이 화면이 제목을 렌더하고 header trait를 갖는다", () => {
  renderScreen();

  const title = screen.getByTestId("roleplay-list-screen-title");
  expect(title).toHaveTextContent("롤플레이");
  expect(title).toHaveAttribute("accessibility-traits", "header");
});

test("[U1] 세로 스크롤 컨테이너가 서고 세로 · 스크롤바 켜짐이 붙는다", () => {
  renderScreen();

  const scroll = screen.getByTestId("roleplay-list-screen-scroll");
  expect(scroll).toHaveAttribute("scroll-orientation", "vertical");
  expect(scroll).toHaveAttribute("scroll-bar-enable", "true");
});

test("[U3] 화면 제목이 스크롤 컨테이너 밖에 있다", () => {
  renderScreen();

  const scroll = screen.getByTestId("roleplay-list-screen-scroll");
  expect(within(scroll).queryByTestId("roleplay-list-screen-title")).not.toBeInTheDocument();
});

test("[U8] 스크롤 컨테이너와 목록 상자에 accessibility-*가 하나도 붙지 않는다", () => {
  renderScreen();

  for (const testId of ["roleplay-list-screen-scroll", "roleplay-list-screen-list"]) {
    expect(
      attributeNames(screen.getByTestId(testId)).filter((name) => name.startsWith("accessibility")),
    ).toEqual([]);
  }
});

test("[S1] 세로 스크롤의 직계 자식이 정확히 하나이고 목록 상자다", () => {
  renderScreen();

  const scroll = screen.getByTestId("roleplay-list-screen-scroll");
  expect(scroll.children).toHaveLength(1);
  expect(scroll.children[0]).toBe(screen.getByTestId("roleplay-list-screen-list"));
});

test("[S2] 구획이 받은 순서대로 서고, 구획 안 카드도 받은 순서대로 선다", () => {
  renderScreen();

  const list = screen.getByTestId("roleplay-list-screen-list");
  expect(Array.from(list.children).map((el) => el.getAttribute("data-testid"))).toEqual([
    "roleplay-list-section-tutorial",
    "roleplay-list-section-cafe",
  ]);

  const row = screen.getByTestId("roleplay-list-section-row-tutorial");
  expect(Array.from(row.children).map((el) => el.getAttribute("data-testid"))).toEqual([
    "roleplay-list-item-appointment-confirmation",
    "roleplay-list-item-appointment-confirmation-phone-call",
  ]);
});

test("[S3] 카드 줄은 가로로 넘기는 스크롤 안에 선다", () => {
  renderScreen();

  const row = screen.getByTestId("roleplay-list-section-row-tutorial");
  expect(row.parentElement).toHaveAttribute("scroll-orientation", "horizontal");
  expect(row.parentElement?.children).toHaveLength(1);
});

test("[S4] 열린 구획의 카드 tap → onSelectItem이 정확히 1회, 인자는 그 항목", () => {
  const onSelectItem = vi.fn<(item: RoleplayItem) => void>();
  renderScreen({ onSelectItem });

  fireEvent.tap(screen.getByTestId("roleplay-list-item-appointment-confirmation-phone-call"), {});

  expect(onSelectItem).toHaveBeenCalledTimes(1);
  expect(onSelectItem).toHaveBeenCalledWith(phoneCallItem);
});

test("[S5] header trait는 화면 제목과 구획 머리들뿐이고 그 순서다", () => {
  const { container } = renderScreen();

  const headers = Array.from(container.querySelectorAll('[accessibility-traits="header"]'));
  expect(headers.map((el) => el.getAttribute("data-testid"))).toEqual([
    "roleplay-list-screen-title",
    "roleplay-list-section-header-tutorial",
    "roleplay-list-section-header-cafe",
  ]);
});

test("[S6] 구획 머리는 두 줄을 한 접근성 요소로 묶어 읽는다", () => {
  renderScreen();

  const header = screen.getByTestId("roleplay-list-section-header-tutorial");
  expect(header).toHaveTextContent("Episode 0.");
  expect(header).toHaveTextContent("Tutorial.");
  expect(header).toHaveAttribute("accessibility-element", "true");
  expect(header).toHaveAttribute("accessibility-label", "Episode 0. Tutorial.");
});

test("[S7] 구획이 없으면 목록 상자가 서고 구획 0개다", () => {
  renderScreen({ sections: [] });

  expect(screen.getByTestId("roleplay-list-screen-list").children).toHaveLength(0);
});

test("[L1] 잠긴 구획은 잠김을 싣고, 머리 이름이 여는 조건을 말한다", () => {
  renderScreen();

  expect(screen.getByTestId("roleplay-list-section-cafe")).toHaveAttribute(
    "data-unlocked",
    "false",
  );
  expect(screen.getByTestId("roleplay-list-section-header-cafe")).toHaveAttribute(
    "accessibility-label",
    "Episode 1. Cafe., 잠김, 여정에서 이 에피소드를 끝내면 열립니다",
  );
});

test("[L2] 잠긴 구획의 카드 tap → onSelectItem 0회", () => {
  const onSelectItem = vi.fn<(item: RoleplayItem) => void>();
  renderScreen({ onSelectItem });

  fireEvent.tap(screen.getByTestId("roleplay-list-item-cafe-arrival-visual-novel"), {});

  expect(onSelectItem).not.toHaveBeenCalled();
});

test("[L3] 잠긴 구획에는 전체 보기가 없고 열린 구획에는 있다", () => {
  renderScreen();

  expect(screen.getByTestId("roleplay-list-section-view-all-tutorial")).toBeInTheDocument();
  expect(screen.queryByTestId("roleplay-list-section-view-all-cafe")).not.toBeInTheDocument();
});

test("[V1] 전체 보기가 버튼으로 서고 이름에 에피소드를 싣는다", () => {
  renderScreen();

  const viewAll = screen.getByTestId("roleplay-list-section-view-all-tutorial");
  expect(viewAll).toHaveTextContent("전체 보기");
  expect(viewAll).toHaveAttribute("accessibility-element", "true");
  expect(viewAll).toHaveAttribute("accessibility-traits", "button");
  expect(viewAll).toHaveAttribute("accessibility-label", "Episode 0. 전체 보기");
});

test("[V2] 전체 보기 tap → onViewAll이 그 에피소드 id로 1회, onSelectItem 0회", () => {
  const onViewAll = vi.fn<(episodeId: string) => void>();
  const onSelectItem = vi.fn<(item: RoleplayItem) => void>();
  renderScreen({ onViewAll, onSelectItem });

  fireEvent.tap(screen.getByTestId("roleplay-list-section-view-all-tutorial"), {});

  expect(onViewAll).toHaveBeenCalledTimes(1);
  expect(onViewAll).toHaveBeenCalledWith("tutorial");
  expect(onSelectItem).not.toHaveBeenCalled();
});
