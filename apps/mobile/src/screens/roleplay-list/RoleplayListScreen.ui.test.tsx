import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type {
  PremiumRoleplayItem,
  RoleplayEpisodeId,
  RoleplayItem,
  RoleplaySection,
} from "./roleplay-list.contract";
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

const wrongOrder: PremiumRoleplayItem = {
  id: "premium-wrong-order",
  title: "주문이 잘못 나왔어요",
  situation: "카페 직원에게 정중하게 말하기",
};

const sharedTable: PremiumRoleplayItem = {
  id: "premium-shared-table",
  title: "합석해도 될까요?",
  situation: "옆자리 손님과 자리 나누기",
};

const openSection: RoleplaySection = {
  episodeId: "tutorial",
  label: "Episode 0.",
  title: "Tutorial.",
  unlocked: true,
  items: [messengerItem, phoneCallItem],
  premiumItems: [wrongOrder, sharedTable],
};

// ⚠ `"cafe"`의 캐스트는 의도한 것입니다. `RoleplayEpisodeId`(= `JourneyEpisodeId`)는
// 오늘 데이터에 있는 `"tutorial"` 하나로 닫혀 있고, 제품 코드는 그 닫힘에서 타입 안전을
// 얻습니다 — 에피소드 id의 오타가 `tsc`에 섭니다. 아래 케이스들이 보는 것은 **다른 것**
// 입니다: 「열린 구획과 잠긴 구획이 함께 설 때 각각 어떻게 그려지는가」라, 에피소드가
// **둘** 있어야 볼 수 있습니다. 오늘 데이터에 에피소드가 하나뿐이라 아직 없는
// 에피소드를 픽스처가 지어냅니다. 캐스트는 이 경계에만 두고, 없는 id를 union에 미리
// 넣지 않습니다 — 그러면 데이터에 없는 것을 타입이 있다고 말하게 됩니다.
const lockedSection: RoleplaySection = {
  episodeId: "cafe" as RoleplayEpisodeId,
  label: "Episode 1.",
  title: "Cafe.",
  unlocked: false,
  items: [visualNovelItem],
  premiumItems: [wrongOrder],
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
  expect(within(scroll).queryByTestId("roleplay-list-screen-head")).not.toBeInTheDocument();
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

// ------------------------------------------------------------------ 결제 롤플레이 줄

const noPremiumSection: RoleplaySection = { ...openSection, premiumItems: [] };

test("[P1] 결제 롤플레이 줄이 기본 줄 아래에 따로 서고 카드가 받은 순서대로 선다", () => {
  renderScreen({ sections: [openSection] });

  const section = screen.getByTestId("roleplay-list-section-tutorial");
  const basicRow = screen.getByTestId("roleplay-list-section-row-tutorial");
  const premium = screen.getByTestId("roleplay-list-section-premium-tutorial");
  expect(within(section).getByTestId("roleplay-list-section-premium-tutorial")).toBe(premium);
  expect(basicRow.compareDocumentPosition(premium) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  const row = screen.getByTestId("roleplay-list-section-premium-row-tutorial");
  expect(Array.from(row.children).map((el) => el.getAttribute("data-testid"))).toEqual([
    "roleplay-premium-card-premium-wrong-order",
    "roleplay-premium-card-premium-shared-table",
  ]);
  expect(row.parentElement).toHaveAttribute("scroll-orientation", "horizontal");
});

test("[P2] 결제 롤플레이가 없는 구획은 둘째 줄을 그리지 않는다", () => {
  renderScreen({ sections: [noPremiumSection] });

  expect(screen.queryByTestId("roleplay-list-section-premium-tutorial")).not.toBeInTheDocument();
});

test("[P3] 줄 머리는 한 접근성 요소로 읽히고 header trait를 갖지 않는다", () => {
  renderScreen({ sections: [openSection] });

  const header = screen.getByTestId("roleplay-list-section-premium-header-tutorial");
  expect(header).toHaveTextContent("플러스");
  expect(header).toHaveAttribute("accessibility-element", "true");
  expect(header).toHaveAttribute(
    "accessibility-label",
    "Episode 0. 플러스 롤플레이, 이 에피소드와 닮은 상황을 더 연습해요",
  );
  expect(header).not.toHaveAttribute("accessibility-traits", "header");
});

test("[P4] 열린 에피소드의 결제 카드는 결제 잠김이고, 잠긴 에피소드의 것은 에피소드 잠김이다", () => {
  renderScreen();

  const openRow = screen.getByTestId("roleplay-list-section-premium-row-tutorial");
  const lockedRow = screen.getByTestId("roleplay-list-section-premium-row-cafe");
  expect(within(openRow).getByTestId("roleplay-premium-card-premium-wrong-order")).toHaveAttribute(
    "data-lock",
    "payment",
  );
  expect(
    within(lockedRow).getByTestId("roleplay-premium-card-premium-wrong-order"),
  ).toHaveAttribute("data-lock", "episode");
});

test("[P5] 결제 잠김 카드를 tap하면 그 항목의 안내가 뜨고 onSelectItem은 불리지 않는다", () => {
  const onSelectItem = vi.fn<(item: RoleplayItem) => void>();
  renderScreen({ sections: [openSection], onSelectItem });
  expect(screen.queryByTestId("roleplay-list-premium-notice")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("roleplay-premium-card-premium-shared-table"), {});

  const notice = screen.getByTestId("roleplay-list-premium-notice");
  expect(within(notice).getByTestId("ui-lynx-dialog-title")).toHaveTextContent("플러스 롤플레이");
  expect(within(notice).getByTestId("ui-lynx-dialog-description")).toHaveTextContent(
    "「합석해도 될까요?」 롤플레이는 플러스 전용이에요. 플러스는 아직 준비 중이에요.",
  );
  expect(onSelectItem).not.toHaveBeenCalled();
});

test("[P6] 안내의 확인을 tap하면 안내가 닫힌다", () => {
  renderScreen({ sections: [openSection] });
  fireEvent.tap(screen.getByTestId("roleplay-premium-card-premium-wrong-order"), {});

  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-close")).getByTestId("ui-lynx-button"),
    {},
  );

  expect(screen.queryByTestId("roleplay-list-premium-notice")).not.toBeInTheDocument();
});

test("[P7] 에피소드 잠김인 결제 카드는 tap해도 안내가 뜨지 않는다", () => {
  renderScreen({ sections: [lockedSection] });

  fireEvent.tap(screen.getByTestId("roleplay-premium-card-premium-wrong-order"), {});

  expect(screen.queryByTestId("roleplay-list-premium-notice")).not.toBeInTheDocument();
});

test("[P8] 안내는 스크롤 밖에, 스크롤 뒤에 선다", () => {
  renderScreen({ sections: [openSection] });
  fireEvent.tap(screen.getByTestId("roleplay-premium-card-premium-wrong-order"), {});

  const scroll = screen.getByTestId("roleplay-list-screen-scroll");
  expect(within(scroll).queryByTestId("roleplay-list-premium-notice")).not.toBeInTheDocument();
  expect(
    scroll.compareDocumentPosition(screen.getByTestId("roleplay-list-premium-notice")) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

test("[P9] 안내가 떠 있는 동안 뒤쪽(제목 · 구획)이 가려지고, 닫히면 풀린다", () => {
  renderScreen({ sections: [openSection] });
  const head = screen.getByTestId("roleplay-list-screen-head");
  const section = screen.getByTestId("roleplay-list-section-tutorial");
  expect(head).toHaveAttribute("accessibility-elements-hidden", "false");
  expect(section).toHaveAttribute("accessibility-elements-hidden", "false");

  fireEvent.tap(screen.getByTestId("roleplay-premium-card-premium-wrong-order"), {});
  expect(head).toHaveAttribute("accessibility-elements-hidden", "true");
  expect(section).toHaveAttribute("accessibility-elements-hidden", "true");

  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-close")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(head).toHaveAttribute("accessibility-elements-hidden", "false");
  expect(section).toHaveAttribute("accessibility-elements-hidden", "false");
});

// 안내가 떠 있는 동안 셸의 전역 머리도 가려야 합니다 — 머리는 이 화면 밖이라 화면이
// 열림을 알립니다(`onLayerChange`).
test("[P8] 안내가 뜨고 질 때 onLayerChange가 true → false로 불린다", () => {
  const onLayerChange = vi.fn<(open: boolean) => void>();
  renderScreen({ sections: [openSection], onLayerChange });
  expect(onLayerChange).toHaveBeenLastCalledWith(false);

  fireEvent.tap(screen.getByTestId("roleplay-premium-card-premium-wrong-order"), {});
  expect(onLayerChange).toHaveBeenLastCalledWith(true);

  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-close")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(onLayerChange).toHaveBeenLastCalledWith(false);
});

test("[P9] 안내가 뜬 채 화면이 내려가면 onLayerChange(false)로 가림을 풀어 둔다", () => {
  const onLayerChange = vi.fn<(open: boolean) => void>();
  const { unmount } = renderScreen({ sections: [openSection], onLayerChange });
  fireEvent.tap(screen.getByTestId("roleplay-premium-card-premium-wrong-order"), {});

  unmount();

  expect(onLayerChange).toHaveBeenLastCalledWith(false);
});
