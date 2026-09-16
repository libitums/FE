import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { RoleplayItem } from "./roleplay-list.contract";
import { RoleplayListScreen } from "./RoleplayListScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
//
// LIB-255 `ui-design`: 화면 계약이 `RoleplayListScreenProps`(`items`·`onSelectItem`)로
// 바뀌어(spec §2.5) 기존 render 호출에 fixture props를 더한다 — 기존 단언은 그대로 두고 목록 상자·항목 렌더 단언(S 계열)을 새로 더한다.
// 계획: .agent-harness/work/lib-255/test-plan.md ui § `RoleplayListScreen.ui.test.tsx`.

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

// 이 화면은 제목 텍스트 하나와 흐름 영역의 목록 상자를 그린다 (screens.contract.ts).
test("롤플레이 화면이 제목을 렌더한다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  expect(screen.getByTestId("roleplay-list-screen-title")).toHaveTextContent("롤플레이");
});

// 재고정 2026-09-02: 제목 다섯이 같은 방식으로 heading이 된다 (screens.contract.ts).
test("롤플레이 화면 제목이 accessibility-traits header를 갖는다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  expect(screen.getByTestId("roleplay-list-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );
});

// ---------------------------------------------------------------- 스크롤 영역 (LIB-226 계약 §3.2 U1·U3)
//
// 롤플레이의 흐름 자식은 목록 상자 하나다(계약 §1.6). 고정은 제목 <text> 하나다.

// U1: 스크롤 컨테이너가 존재한다.
test("[U1] roleplay-list-screen-scroll이 존재한다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  expect(screen.getByTestId("roleplay-list-screen-scroll")).toBeInTheDocument();
});

// U3: 고정 자식(제목)이 스크롤 컨테이너 밖에 있다.
test("[U3] roleplay-list-screen-title이 스크롤 컨테이너 밖에 있다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  const scroll = screen.getByTestId("roleplay-list-screen-scroll");
  expect(within(scroll).queryByTestId("roleplay-list-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 스크롤 영역 접근성 부재 (LIB-226 계약 §3.2.1 U8)
//
// R6·R6.1의 「없음」을 지키는 회귀 그물이다(계약 §2.3 · §3.2.1). 오늘의 구현은 이
// 넷을 하나도 붙이지 않는다 — **red가 없는 것이 이 케이스의 성질이다.** 다음 편집이
// 넷 중 하나라도 붙이면 여기서만 red가 되고, 그 red는 이 파일을 고치라는 신호가
// 아니라 계약(§8.3)으로 되돌아가라는 신호다.
test("[U8] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  const scroll = screen.getByTestId("roleplay-list-screen-scroll");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

// ---------------------------------------------------------------- 스크롤 세로 동작 (LIB-226 계약 §3.2.2 U9·U10·U11, r4)
//
// R5 폐기 → R5.1~R5.3. `<scroll-view>`는 `scroll-orientation` prop이 없으면
// `_enableScrollY` 초기값이 NO라 세로 스크롤이 원리적으로 불가능하다(design §8.2).
// jsdom은 레이아웃이 없어 실제로 스크롤되는지는 이 계층이 원리적으로 못 본다
// (§3.2.2 말미, 실기가 답한다).
//
// U11의 기댓값이 문자열 "true"인 이유: `@lynx-js/testing-environment`의
// `__SetAttribute`(ElementPAPI.js:87~89)가 boolean을 `JSON.stringify`로 직렬화한다.

// U9: scroll-orientation이 "vertical"로 붙어 있다.
test("[U9] roleplay-list-screen-scroll에 scroll-orientation='vertical'이 붙는다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  expect(screen.getByTestId("roleplay-list-screen-scroll")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
});

// U11: scroll-bar-enable이 (JSON.stringify를 거친) 문자열 "true"로 붙어 있다.
test("[U11] roleplay-list-screen-scroll에 scroll-bar-enable='true'가 붙는다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  expect(screen.getByTestId("roleplay-list-screen-scroll")).toHaveAttribute(
    "scroll-bar-enable",
    "true",
  );
});

// U10: 스크롤 컨테이너의 직계 요소 자식이 하나를 넘지 않는다. 목록 상자(roleplay-list-screen-list)
// 하나가 그 자리다(spec §2.5) — 오늘의 fixture(3항목)에서도 직계 자식은 여전히 1개다.
test("[U10] 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  expect(screen.getByTestId("roleplay-list-screen-scroll").children.length).toBeLessThanOrEqual(1);
});

// ---------------------------------------------------------------- 목록 상자 · 항목 렌더 (LIB-255 계약 §2.5)

// S1: 스크롤의 직계 요소 자식이 정확히 하나이고 그것이 목록 상자다.
test("[S1] roleplay-list-screen-scroll의 직계 자식이 정확히 하나이고 roleplay-list-screen-list다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  const scroll = screen.getByTestId("roleplay-list-screen-scroll");
  expect(scroll.children).toHaveLength(1);
  expect(scroll.children[0]).toHaveAttribute("data-testid", "roleplay-list-screen-list");
});

// S2: 목록 상자 안 항목 루트 testid 순서가 items 순서와 같다.
test("[S2] roleplay-list-screen-list 안 항목 순서가 items 순서와 같다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  const list = screen.getByTestId("roleplay-list-screen-list");
  const testids = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(testids).toEqual(items.map((item) => `roleplay-list-item-${item.unitId}`));
});

// S3: 목록 상자에 accessibility-*가 하나도 붙지 않는다(ADR-0022 D4·D5).
test("[S3] roleplay-list-screen-list에 accessibility-*가 하나도 붙지 않는다", () => {
  render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  const list = screen.getByTestId("roleplay-list-screen-list");
  expect(list).not.toHaveAttribute("accessibility-element");
  expect(list).not.toHaveAttribute("accessibility-label");
  expect(list).not.toHaveAttribute("accessibility-traits");
  expect(list).not.toHaveAttribute("accessibility-elements-hidden");
});

// S4: 항목 tap이 onSelectItem을 정확히 1회, 그 항목으로 올린다.
test("[S4] 항목 tap → onSelectItem이 정확히 1회, 인자는 그 항목", () => {
  const onSelectItem = vi.fn();
  render(<RoleplayListScreen items={items} onSelectItem={onSelectItem} />);

  fireEvent.tap(screen.getByTestId(`roleplay-list-item-${phoneCallItem.unitId}`), {});

  expect(onSelectItem).toHaveBeenCalledTimes(1);
  expect(onSelectItem).toHaveBeenCalledWith(phoneCallItem);
});

// S5: 화면 안 header trait를 가진 요소가 roleplay-list-screen-title 하나다(LIB-226 [I3] 고정).
test("[S5] header trait를 가진 요소가 roleplay-list-screen-title 하나다", () => {
  const { container } = render(<RoleplayListScreen items={items} onSelectItem={vi.fn()} />);

  const headers = container.querySelectorAll('[accessibility-traits="header"]');
  expect(headers).toHaveLength(1);
  expect(headers[0]).toBe(screen.getByTestId("roleplay-list-screen-title"));
});

// S6: 항목 하나짜리 · 순서를 바꾼 fixture에서도 S2가 성립한다.
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
