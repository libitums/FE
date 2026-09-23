import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { RoleplayItem } from "./roleplay-list.contract";
import { RoleplayListScreen } from "./RoleplayListScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
//
// 화면 계약이 `RoleplayListScreenProps`(`items`·`onSelectItem`)로 바뀌어 기존 render
// 호출에 fixture props를 더했습니다 — 기존 단언은 그대로 두고 목록 상자·항목 렌더
// 단언(S 계열)을 새로 더했습니다.

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

const items: readonly RoleplayItem[] = [messengerItem, phoneCallItem, visualNovelItem];

// 이 화면은 제목 텍스트 하나와 흐름 영역의 목록 상자를 그립니다 (screens.contract.ts).
test("롤플레이 화면이 제목을 렌더한다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  expect(screen.getByTestId("roleplay-list-screen-title")).toHaveTextContent("롤플레이");
});

// 재고정 2026-09-02: 제목 다섯이 같은 방식으로 heading이 됩니다 (screens.contract.ts).
test("롤플레이 화면 제목이 accessibility-traits header를 갖는다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  expect(screen.getByTestId("roleplay-list-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );
});

// ---------------------------------------------------------------- 스크롤 영역
//
// 롤플레이의 흐름 자식은 목록 상자 하나입니다. 고정은 제목 <text> 하나입니다.

test("[U1] roleplay-list-screen-scroll이 존재한다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  expect(screen.getByTestId("roleplay-list-screen-scroll")).toBeInTheDocument();
});

test("[U3] roleplay-list-screen-title이 스크롤 컨테이너 밖에 있다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  const scroll = screen.getByTestId("roleplay-list-screen-scroll");
  expect(within(scroll).queryByTestId("roleplay-list-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 스크롤 영역 접근성 부재
//
// 「없음」을 지키는 회귀 그물입니다. 오늘의 구현은 이 넷을 하나도 붙이지 않습니다
// — **red가 없는 것이 이 케이스의 성질입니다.** 다음 편집이 넷 중 하나라도
// 붙이면 여기서만 red가 되고, 그 red는 이 파일을 고치라는 신호가 아니라 계약으로
// 되돌아가라는 신호입니다.
test("[U8] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  const scroll = screen.getByTestId("roleplay-list-screen-scroll");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

// ---------------------------------------------------------------- 스크롤 세로 동작
//
// `<scroll-view>`는 `scroll-orientation` prop이 없으면 `_enableScrollY` 초기값이
// NO라 세로 스크롤이 원리적으로 불가능합니다. jsdom은 레이아웃이 없어 실제로
// 스크롤되는지는 이 계층이 원리적으로 못 봅니다(실기가 답합니다).
//
// U11의 기댓값이 문자열 "true"인 이유: `@lynx-js/testing-environment`의
// `__SetAttribute`(ElementPAPI.js:87~89)가 boolean을 `JSON.stringify`로
// 직렬화합니다.

test("[U9] roleplay-list-screen-scroll에 scroll-orientation='vertical'이 붙는다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  expect(screen.getByTestId("roleplay-list-screen-scroll")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
});

test("[U11] roleplay-list-screen-scroll에 scroll-bar-enable='true'가 붙는다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  expect(screen.getByTestId("roleplay-list-screen-scroll")).toHaveAttribute(
    "scroll-bar-enable",
    "true",
  );
});

// U10 — 목록 상자(roleplay-list-screen-list) 하나가 그 자리입니다 — 오늘의
// fixture(3항목)에서도 직계 자식은 여전히 1개입니다.
test("[U10] 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  expect(screen.getByTestId("roleplay-list-screen-scroll").children.length).toBeLessThanOrEqual(1);
});

// ---------------------------------------------------------------- 목록 상자 · 항목 렌더

test("[S1] roleplay-list-screen-scroll의 직계 자식이 정확히 하나이고 roleplay-list-screen-list다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  const scroll = screen.getByTestId("roleplay-list-screen-scroll");
  expect(scroll.children).toHaveLength(1);
  expect(scroll.children[0]).toHaveAttribute("data-testid", "roleplay-list-screen-list");
});

test("[S2] roleplay-list-screen-list 안 항목 순서가 items 순서와 같다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  const list = screen.getByTestId("roleplay-list-screen-list");
  const testids = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(testids).toEqual(items.map((item) => `roleplay-list-item-${item.unitId}`));
});

test("[S3] roleplay-list-screen-list에 accessibility-*가 하나도 붙지 않는다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  const list = screen.getByTestId("roleplay-list-screen-list");
  expect(list).not.toHaveAttribute("accessibility-element");
  expect(list).not.toHaveAttribute("accessibility-label");
  expect(list).not.toHaveAttribute("accessibility-traits");
  expect(list).not.toHaveAttribute("accessibility-elements-hidden");
});

test("[S4] 항목 tap → onSelectItem이 정확히 1회, 인자는 그 항목", () => {
  const onSelectItem = vi.fn();
  render(<RoleplayListScreen items={items} onSelectItem={onSelectItem} />);

  fireEvent.tap(screen.getByTestId(`roleplay-list-item-${phoneCallItem.unitId}`), {});

  expect(onSelectItem).toHaveBeenCalledTimes(1);
  expect(onSelectItem).toHaveBeenCalledWith(phoneCallItem);
});

test("[S5] header trait를 가진 요소가 roleplay-list-screen-title 하나다", () => {
  const { container } = render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  const headers = container.querySelectorAll('[accessibility-traits="header"]');
  expect(headers).toHaveLength(1);
  expect(headers[0]).toBe(screen.getByTestId("roleplay-list-screen-title"));
});

// S6 — 항목 하나짜리·순서를 바꾼 fixture에서도 S2가 성립하는지 봅니다.
test("[S6] 항목 하나짜리 fixture에서도 순서가 성립한다", () => {
  const single: readonly RoleplayItem[] = [visualNovelItem];
  render(<RoleplayListScreen items={single} onSelectItem={vi.fn()} />);

  const list = screen.getByTestId("roleplay-list-screen-list");
  const testids = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(testids).toEqual([`roleplay-list-item-${visualNovelItem.unitId}`]);
});

test("[S6] 순서를 바꾼 fixture에서도 순서가 성립한다", () => {
  const reordered: readonly RoleplayItem[] = [visualNovelItem, phoneCallItem, messengerItem];
  render(<RoleplayListScreen items={reordered} onSelectItem={vi.fn()} />);

  const list = screen.getByTestId("roleplay-list-screen-list");
  const testids = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(testids).toEqual(reordered.map((item) => `roleplay-list-item-${item.unitId}`));
});
