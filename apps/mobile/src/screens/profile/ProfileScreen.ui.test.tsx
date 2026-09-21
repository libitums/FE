import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { ProfileItem } from "./profile.contract";
import { ProfileScreen } from "./ProfileScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용(ADR-0006 D4). fixture는 이 파일 안에서 짓는다
// (`profile-items.ts`를 import하지 않는다 — test-plan.md 「ui」 서문). `toHaveClass` ·
// `toHaveStyle` · `toBeVisible`을 쓰지 않는다(`docs/conventions/code.md`). 텍스트
// 질의(`getByText`)를 쓰지 않는다 — testid로 질의한다.
//
// 계약: .agent-harness/work/lib-259/spec.md §2.8 · §4.4 · §4.8 · §4.10.
// 계획: .agent-harness/work/lib-259/test-plan.md ui § `ProfileScreen.ui.test.tsx` PR1~PR7.

const items: readonly ProfileItem[] = [
  { id: "name", label: "이름", value: "두루 학습자" },
  { id: "learning-language", label: "학습 언어", value: "한국어" },
  { id: "learning-goal", label: "학습 목표", value: "일상 대화" },
];

// PR1: 항목이 fixture 순서대로 그려지고 label·value 텍스트가 fixture 값이다.
test("[PR1] 항목이 fixture 순서대로 그려지고 label·value 텍스트가 fixture 값이다", () => {
  render(<ProfileScreen items={items} onExit={vi.fn()} />);

  const list = screen.getByTestId("profile-screen-list");
  const testids = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(testids).toEqual(items.map((item) => `profile-item-${item.id}`));

  for (const item of items) {
    expect(screen.getByTestId(`profile-item-label-${item.id}`)).toHaveTextContent(item.label);
    expect(screen.getByTestId(`profile-item-value-${item.id}`)).toHaveTextContent(item.value);
  }
});

// PR2: 나가기가 "설정으로"이고 접근성 채널이 정확하다(D-d).
test("[PR2] profile-screen-exit 텍스트·접근성이 '설정으로'다", () => {
  render(<ProfileScreen items={items} onExit={vi.fn()} />);

  const exit = screen.getByTestId("profile-screen-exit");
  expect(exit).toHaveTextContent("설정으로");
  expect(exit).toHaveAttribute("accessibility-element", "true");
  expect(exit).toHaveAttribute("accessibility-traits", "button");
  expect(exit).toHaveAttribute("accessibility-label", "설정으로");
});

// PR3: 나가기 tap → onExit 정확히 1회.
test("[PR3] 나가기 tap → onExit 정확히 1회", () => {
  const onExit = vi.fn();
  render(<ProfileScreen items={items} onExit={onExit} />);

  fireEvent.tap(screen.getByTestId("profile-screen-exit"), {});

  expect(onExit).toHaveBeenCalledTimes(1);
});

// PR4: 입력·편집 수단 0건(수용 기준 3) — 조작 단위가 나가기 하나뿐이고 input·textarea가 0개다.
test("[PR4] 입력·편집 수단이 0건이다 — 조작 단위가 나가기 하나다", () => {
  const { container } = render(<ProfileScreen items={items} onExit={vi.fn()} />);

  expect(
    [...container.querySelectorAll("[accessibility-element]")].map((el) =>
      el.getAttribute("data-testid"),
    ),
  ).toEqual(["profile-screen-exit"]);
  expect(
    [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
      el.getAttribute("data-testid"),
    ),
  ).toEqual(["profile-screen-exit"]);
  expect(container.querySelectorAll("input")).toHaveLength(0);
  expect(container.querySelectorAll("textarea")).toHaveLength(0);
});

// PR5: 스크롤 3분할 — 직계 요소 자식이 정확히 하나이고 profile-screen-list다.
// 제목·나가기는 스크롤 밖이다.
test("[PR5] 스크롤 3분할 — 직계 자식이 profile-screen-list 하나이고 제목·나가기가 스크롤 밖이다", () => {
  render(<ProfileScreen items={items} onExit={vi.fn()} />);

  const scroll = screen.getByTestId("profile-screen-scroll");
  expect(scroll).toHaveAttribute("scroll-orientation", "vertical");
  expect(scroll).toHaveAttribute("scroll-bar-enable", "true");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");

  expect(scroll.children).toHaveLength(1);
  expect(scroll.children[0]).toHaveAttribute("data-testid", "profile-screen-list");

  expect(within(scroll).queryByTestId("profile-screen-title")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("profile-screen-exit")).not.toBeInTheDocument();
  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("profile-screen-exit")).toBeInTheDocument();
});

// PR6: items=[] → 목록 상자는 서고 항목이 0개다.
test("[PR6] items=[] → 목록 상자가 서고 항목이 0개다", () => {
  render(<ProfileScreen items={[]} onExit={vi.fn()} />);

  const list = screen.getByTestId("profile-screen-list");
  expect(list).toBeInTheDocument();
  expect(list.children).toHaveLength(0);
});

// PR7 (가드): profile-screen-title이 header이고 화면 안 header가 하나다(D4).
test("[PR7] profile-screen-title이 header이고 화면 안 header가 하나다", () => {
  const { container } = render(<ProfileScreen items={items} onExit={vi.fn()} />);

  const title = screen.getByTestId("profile-screen-title");
  expect(title).toHaveAttribute("accessibility-traits", "header");

  const headers = container.querySelectorAll('[accessibility-traits="header"]');
  expect(headers).toHaveLength(1);
  expect(headers[0]).toBe(title);
});
