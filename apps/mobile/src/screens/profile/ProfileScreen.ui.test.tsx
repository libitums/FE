import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { UiCopyContext } from "../../lib/ui-copy";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { markedUiCopy } from "../../lib/ui-copy.test-support";
import type { ProfileItem } from "./profile.contract";
import { ProfileScreen } from "./ProfileScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용(ADR-0006 D4). fixture는 이 파일 안에서 짓습니다
// (`profile-items.ts`를 import하지 않습니다). `toHaveClass`·`toHaveStyle`·
// `toBeVisible`을 쓰지 않습니다(`docs/conventions/code.md`). 텍스트 질의(`getByText`)를
// 쓰지 않습니다 — testid로 질의합니다.

const items: readonly ProfileItem[] = [
  { id: "name", value: "Duru Learner" },
  { id: "learning-language", value: "Korean" },
  { id: "learning-goal", value: "Everyday conversation" },
];

test("[PR1] 항목이 fixture 순서대로 그려지고 label·value 텍스트가 fixture 값이다", () => {
  render(<ProfileScreen items={items} onExit={vi.fn()} />);

  const list = screen.getByTestId("profile-screen-list");
  // 항목은 카드(`profile-screen-card`) 안에 섭니다.
  const testids = Array.from(list.querySelectorAll('[data-testid^="profile-item-"]'))
    .map((el) => el.getAttribute("data-testid"))
    .filter(
      (id) => !id?.startsWith("profile-item-label-") && !id?.startsWith("profile-item-value-"),
    );
  expect(testids).toEqual(items.map((item) => `profile-item-${item.id}`));

  for (const item of items) {
    expect(screen.getByTestId(`profile-item-label-${item.id}`)).toHaveTextContent(
      uiCopyEn.profile.itemLabel[item.id],
    );
    expect(screen.getByTestId(`profile-item-value-${item.id}`)).toHaveTextContent(item.value);
  }
});

test("[PR2] 나가기는 동그란 뒤로 버튼이고 접근성 이름이 'Back to settings'다", () => {
  render(<ProfileScreen items={items} onExit={vi.fn()} />);

  const exit = within(screen.getByTestId("profile-screen-exit")).getByTestId(
    "ui-lynx-round-button",
  );
  expect(exit).toHaveAttribute("accessibility-element", "true");
  expect(exit).toHaveAttribute("accessibility-traits", "button");
  expect(exit).toHaveAttribute("accessibility-label", "Back to settings");
});

test("[PR3] 나가기 tap → onExit 정확히 1회", () => {
  const onExit = vi.fn();
  render(<ProfileScreen items={items} onExit={onExit} />);

  fireEvent.tap(
    within(screen.getByTestId("profile-screen-exit")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(onExit).toHaveBeenCalledTimes(1);
});

test("[PR4] 입력·편집 수단이 0건이다 — 조작 단위가 나가기 하나다", () => {
  const { container } = render(<ProfileScreen items={items} onExit={vi.fn()} />);

  expect(
    [...container.querySelectorAll("[accessibility-element]")].map((el) =>
      el.getAttribute("data-testid"),
    ),
  ).toEqual(["ui-lynx-round-button"]);
  expect(
    [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
      el.getAttribute("data-testid"),
    ),
  ).toEqual(["ui-lynx-round-button"]);
  expect(container.querySelectorAll("input")).toHaveLength(0);
  expect(container.querySelectorAll("textarea")).toHaveLength(0);
});

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

test("[PR6] items=[] → 목록 상자가 서고 항목이 0개다", () => {
  render(<ProfileScreen items={[]} onExit={vi.fn()} />);

  const list = screen.getByTestId("profile-screen-list");
  expect(list).toBeInTheDocument();
  expect(list.children).toHaveLength(0);
});

test("[PR7] profile-screen-title이 header이고 화면 안 header가 하나다", () => {
  const { container } = render(<ProfileScreen items={items} onExit={vi.fn()} />);

  const title = screen.getByTestId("profile-screen-title");
  expect(title).toHaveAttribute("accessibility-traits", "header");

  const headers = container.querySelectorAll('[accessibility-traits="header"]');
  expect(headers).toHaveLength(1);
  expect(headers[0]).toBe(title);
});

test("[AC2u-E] 제목 · 항목 이름이 영어다", () => {
  render(<ProfileScreen items={items} onExit={vi.fn()} />);

  expect(screen.getByTestId("profile-screen-title")).toHaveTextContent("User profile");
  expect(screen.getByTestId("profile-item-label-name")).toHaveTextContent("Name");
  expect(screen.getByTestId("profile-item-label-learning-language")).toHaveTextContent(
    "Learning language",
  );
  expect(screen.getByTestId("profile-item-label-learning-goal")).toHaveTextContent("Learning goal");
});

test("[AC2u-M] 제목 · 항목 이름 · 나가기 이름이 문구표에서 온다", () => {
  const { container } = render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <ProfileScreen items={items} onExit={vi.fn()} />
    </UiCopyContext.Provider>,
  );

  expect(screen.getByTestId("profile-screen-title")).toHaveTextContent("⟦profile.title⟧");
  expect(screen.getByTestId("profile-item-label-name")).toHaveTextContent(
    "⟦profile.itemLabel.name⟧",
  );
  expect(screen.getByTestId("profile-item-label-learning-language")).toHaveTextContent(
    "⟦profile.itemLabel.learning-language⟧",
  );
  expect(screen.getByTestId("profile-item-label-learning-goal")).toHaveTextContent(
    "⟦profile.itemLabel.learning-goal⟧",
  );
  expect(
    within(screen.getByTestId("profile-screen-exit")).getByTestId("ui-lynx-round-button"),
  ).toHaveAttribute("accessibility-label", "⟦common.backToSettings⟧");
  expect(container.textContent).not.toMatch(/[가-힣]/);
});
