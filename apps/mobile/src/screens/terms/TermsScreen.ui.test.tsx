import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";
import type { TermsSection } from "./terms.contract";
import { TermsScreen } from "./TermsScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용(ADR-0006 D4). fixture는 이 파일 안에서 짓습니다
// (`terms-sections.ts`를 import하지 않습니다). `toHaveClass`·`toHaveStyle`·
// `toBeVisible`을 쓰지 않습니다(`docs/conventions/code.md`). 텍스트 질의(`getByText`)를
// 쓰지 않습니다 — testid로 질의합니다.

const sections: readonly TermsSection[] = [
  {
    id: "collected",
    title: "Information we collect",
    paragraphs: ["First section, first paragraph.", "First section, second paragraph."],
  },
  {
    id: "usage",
    title: "How we use information",
    paragraphs: ["Second section, first paragraph.", "Second section, second paragraph."],
  },
];

test("[TM1] 절과 문단이 fixture 순서대로 그려지고 텍스트가 fixture 값이다", () => {
  render(<TermsScreen sections={sections} onExit={vi.fn()} />);

  const content = screen.getByTestId("terms-screen-content");
  const sectionTestids = Array.from(content.children).map((el) => el.getAttribute("data-testid"));
  expect(sectionTestids).toEqual(sections.map((section) => `terms-section-${section.id}`));

  for (const section of sections) {
    expect(screen.getByTestId(`terms-section-title-${section.id}`)).toHaveTextContent(
      section.title,
    );
    section.paragraphs.forEach((paragraph, index) => {
      expect(
        screen.getByTestId(`terms-section-paragraph-${section.id}-${index}`),
      ).toHaveTextContent(paragraph);
    });
  }
});

test("[TM2] 나가기는 동그란 뒤로 버튼이고 이름이 'Back to settings'이며 tap → onExit 정확히 1회다", () => {
  const onExit = vi.fn();
  render(<TermsScreen sections={sections} onExit={onExit} />);

  const exit = within(screen.getByTestId("terms-screen-exit")).getByTestId("ui-lynx-round-button");
  expect(exit).toHaveAttribute("accessibility-label", "Back to settings");

  fireEvent.tap(exit, {});

  expect(onExit).toHaveBeenCalledTimes(1);
});

test("[TM3] 절 제목마다 accessibility-traits='header'다", () => {
  render(<TermsScreen sections={sections} onExit={vi.fn()} />);

  for (const section of sections) {
    expect(screen.getByTestId(`terms-section-title-${section.id}`)).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
  }
});

test("[TM4] 화면 안 header 목록이 DOM 순서로 화면 제목 → 절 제목 순이다", () => {
  const { container } = render(<TermsScreen sections={sections} onExit={vi.fn()} />);

  const headers = [...container.querySelectorAll('[accessibility-traits="header"]')].map((el) =>
    el.getAttribute("data-testid"),
  );
  expect(headers).toEqual([
    "terms-screen-title",
    ...sections.map((section) => `terms-section-title-${section.id}`),
  ]);
});

test("[TM5] 스크롤 3분할 — 직계 자식이 terms-screen-content 하나이고 머리가 스크롤 밖이다", () => {
  render(<TermsScreen sections={sections} onExit={vi.fn()} />);

  const scroll = screen.getByTestId("terms-screen-scroll");
  expect(scroll).toHaveAttribute("scroll-orientation", "vertical");
  expect(scroll).toHaveAttribute("scroll-bar-enable", "true");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");

  expect(scroll.children).toHaveLength(1);
  expect(scroll.children[0]).toHaveAttribute("data-testid", "terms-screen-content");

  expect(within(scroll).queryByTestId("terms-screen-title")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("terms-screen-exit")).not.toBeInTheDocument();
  expect(screen.getByTestId("terms-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("terms-screen-exit")).toBeInTheDocument();
});

test("[TM6] 문단에 accessibility-*가 0개이고 화면 안 조작 단위가 나가기 하나다", () => {
  const { container } = render(<TermsScreen sections={sections} onExit={vi.fn()} />);

  for (const section of sections) {
    section.paragraphs.forEach((_paragraph, index) => {
      const el = screen.getByTestId(`terms-section-paragraph-${section.id}-${index}`);
      expect(el).not.toHaveAttribute("accessibility-element");
      expect(el).not.toHaveAttribute("accessibility-traits");
      expect(el).not.toHaveAttribute("accessibility-label");
    });
  }

  expect(
    [...container.querySelectorAll("[accessibility-element]")].map((el) =>
      el.getAttribute("data-testid"),
    ),
  ).toEqual(["ui-lynx-round-button"]);
});

test("[TM7] sections=[] → 본문 상자가 서고 절이 0개다", () => {
  render(<TermsScreen sections={[]} onExit={vi.fn()} />);

  const content = screen.getByTestId("terms-screen-content");
  expect(content).toBeInTheDocument();
  expect(content.children).toHaveLength(0);
});

test("[AC3u-E] 화면 제목이 영어다", () => {
  render(<TermsScreen sections={sections} onExit={vi.fn()} />);

  expect(screen.getByTestId("terms-screen-title")).toHaveTextContent("Privacy and terms");
});

test("[AC3u-M] 화면 제목 · 나가기 이름이 문구표에서 온다", () => {
  const { container } = render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <TermsScreen sections={sections} onExit={vi.fn()} />
    </UiCopyContext.Provider>,
  );

  expect(screen.getByTestId("terms-screen-title")).toHaveTextContent("⟦terms.title⟧");
  expect(
    within(screen.getByTestId("terms-screen-exit")).getByTestId("ui-lynx-round-button"),
  ).toHaveAttribute("accessibility-label", "⟦common.backToSettings⟧");
  expect(container.textContent).not.toMatch(/[가-힣]/);
});
