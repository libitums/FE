import { render, screen } from "@lynx-js/react/testing-library";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { MotionProvider } from "../motion";
import { PageIndicator, PAGE_INDICATOR_MAX_PAGE_COUNT } from "./index";

/** 요소와 자손의 accessibility-* 속성을 순서대로 모읍니다. */
const accessibilitySnapshot = (root: Element): Record<string, string>[] =>
  [root, ...Array.from(root.querySelectorAll("*"))].map((element) =>
    Object.fromEntries(
      Array.from(element.attributes)
        .filter((attribute) => attribute.name.startsWith("accessibility-"))
        .map((attribute) => [attribute.name, attribute.value]),
    ),
  );

const css = readFileSync(resolve(import.meta.dirname, "page-indicator.css"), "utf8");

describe("PageIndicator UI contract", () => {
  test("omits the entire indicator for an empty normalized page count", () => {
    render(<PageIndicator currentPage={1} pageCount={0} />);
    expect(screen.queryByTestId("ui-lynx-page-indicator")).not.toBeInTheDocument();
  });

  test.each([
    [1, 1, 1, "Scene 1 of 1"],
    [4, 1, 4, "Scene 1 of 4"],
    [4, 2, 4, "Scene 2 of 4"],
    [4, 4, 4, "Scene 4 of 4"],
    [6, 99, 6, "Scene 6 of 6"],
  ] as const)(
    "renders canonical count, current item, and label (%i/%i)",
    (pageCount, currentPage, count, label) => {
      render(<PageIndicator currentPage={currentPage} pageCount={pageCount} />);
      const root = screen.getByTestId("ui-lynx-page-indicator");
      expect(root).toHaveAttribute("data-count", String(count));
      expect(root).toHaveAttribute(
        "data-current",
        String(Math.min(count, Math.max(1, currentPage))),
      );
      expect(root).toHaveAttribute("accessibility-element", "true");
      expect(root).toHaveAttribute("accessibility-label", label);
      const items = screen.getAllByTestId("ui-lynx-page-indicator-item");
      expect(items).toHaveLength(count);
      expect(items.filter((item) => item.getAttribute("data-active") === "true")).toHaveLength(1);
      expect(items.find((item) => item.getAttribute("data-active") === "true")).toHaveClass(
        "ui-lynx-page-indicator-item-current",
      );
    },
  );

  test("hides the decorative track subtree and gives items no semantics", () => {
    render(<PageIndicator currentPage={2} pageCount={3} />);
    const track = document.querySelector(".ui-lynx-page-indicator-track");
    expect(track).toBeTruthy();
    expect(track).toHaveAttribute("accessibility-elements-hidden", "true");
    for (const item of screen.getAllByTestId("ui-lynx-page-indicator-item")) {
      expect(item).not.toHaveAttribute("accessibility-element");
      expect(item).not.toHaveAttribute("accessibility-label");
      expect(item).not.toHaveAttribute("accessibility-traits");
    }
  });

  test("can leave the spoken progress to an enclosing screen label", () => {
    render(<PageIndicator currentPage={1} pageCount={3} decorative />);
    const root = screen.getByTestId("ui-lynx-page-indicator");
    expect(root).toHaveAttribute("accessibility-element", "false");
    expect(root).not.toHaveAttribute("accessibility-label");
  });

  test("keeps state attributes and spoken state synchronized on rerender", () => {
    const view = render(<PageIndicator currentPage={1} pageCount={4} />);
    view.rerender(<PageIndicator currentPage={3} pageCount={4} />);
    const root = screen.getByTestId("ui-lynx-page-indicator");
    expect(root).toHaveAttribute("data-current", "3");
    expect(root).toHaveAttribute("accessibility-label", "Scene 3 of 4");
    expect(
      screen
        .getAllByTestId("ui-lynx-page-indicator-item")
        .filter((item) => item.getAttribute("data-active") === "true"),
    ).toHaveLength(1);
  });

  test("caps excessive input before rendering indicator items", () => {
    render(<PageIndicator currentPage={10_000} pageCount={10_000} />);

    const root = screen.getByTestId("ui-lynx-page-indicator");
    expect(root).toHaveAttribute("data-count", String(PAGE_INDICATOR_MAX_PAGE_COUNT));
    expect(root).toHaveAttribute("data-current", String(PAGE_INDICATOR_MAX_PAGE_COUNT));
    expect(root).toHaveAttribute("accessibility-label", "Scene 100 of 100");
    expect(screen.getAllByTestId("ui-lynx-page-indicator-item")).toHaveLength(
      PAGE_INDICATOR_MAX_PAGE_COUNT,
    );
  });
});

describe("PageIndicator dedicated CSS contract", () => {
  test("centers one horizontal row with exact dimensions, gap, and pill mapping", () => {
    expect(css).toMatch(/\.ui-lynx-page-indicator-track\s*\{[^}]*display:\s*flex/);
    expect(css).toMatch(/\.ui-lynx-page-indicator-track\s*\{[^}]*flex-direction:\s*row/);
    expect(css).toMatch(/\.ui-lynx-page-indicator-track\s*\{[^}]*justify-content:\s*center/);
    expect(css).toMatch(
      /\.ui-lynx-page-indicator-track\s*\{[^}]*gap:\s*var\(--libitum-spacing-8\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-page-indicator-track\s*\{[^}]*height:\s*var\(--libitum-spacing-8\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-page-indicator-item\s*\{[^}]*width:\s*var\(--libitum-spacing-8\)[^}]*height:\s*var\(--libitum-spacing-8\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-page-indicator-item-current\s*\{[^}]*width:\s*calc\(var\(--libitum-spacing-20\)\s*\+\s*var\(--libitum-spacing-8\)\)/,
    );
  });

  test("uses required colors, radius, and coordinated default transition tokens", () => {
    expect(css).toMatch(
      /\.ui-lynx-page-indicator-item\s*\{[^}]*background-color:\s*var\(--libitum-color-gray-400\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-page-indicator-item\s*\{[^}]*border-radius:\s*var\(--libitum-radius-full\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-page-indicator-item-current\s*\{[^}]*background-color:\s*var\(--libitum-color-brand-primary\)/,
    );
    expect(css).toMatch(
      /transition:\s*width\s+var\(--libitum-motion-duration-progress\)\s+var\(--libitum-motion-easing-enter\)\s*,\s*background-color\s+var\(--libitum-motion-duration-progress\)\s+var\(--libitum-motion-easing-enter\)/,
    );
  });
});

// 테스트 렌더러는 값이 undefined인 data-* 속성을 문자열 "null"로 남깁니다. 부재는 null 또는 "null"로 봅니다.
describe("PageIndicator motion 컨텍스트", () => {
  test("PI1: reduced Provider에서 data-motion을 내고 항목 속성은 그대로다", () => {
    render(
      <MotionProvider motion="reduced">
        <PageIndicator pageCount={3} currentPage={2} />
      </MotionProvider>,
    );
    expect(screen.getByTestId("ui-lynx-page-indicator")).toHaveAttribute("data-motion", "reduced");
    const items = screen.getAllByTestId("ui-lynx-page-indicator-item");
    expect(items.map((item) => item.getAttribute("data-page"))).toEqual(["1", "2", "3"]);
    expect(items.map((item) => item.getAttribute("data-active"))).toEqual([
      "false",
      "true",
      "false",
    ]);
  });

  test("PI2: Provider가 없으면 data-motion이 없고 항목 속성은 같다", () => {
    render(<PageIndicator pageCount={3} currentPage={2} />);
    const indicator = screen.getByTestId("ui-lynx-page-indicator");
    expect(indicator).not.toHaveAttribute("data-motion");
    expect(indicator.hasAttribute("data-motion")).toBe(false);
    const items = screen.getAllByTestId("ui-lynx-page-indicator-item");
    expect(items.map((item) => item.getAttribute("data-page"))).toEqual(["1", "2", "3"]);
    expect(items.map((item) => item.getAttribute("data-active"))).toEqual([
      "false",
      "true",
      "false",
    ]);
  });

  test.each([
    ["기본", {}],
    ["decorative", { decorative: true }],
  ] as const)(
    "PI1(R2). reduced Provider에서도 accessibility-* 속성이 Provider 없이와 같다(%s)",
    (_name, extra) => {
      const plain = render(<PageIndicator pageCount={3} currentPage={2} {...extra} />);
      const expected = accessibilitySnapshot(screen.getByTestId("ui-lynx-page-indicator"));
      plain.unmount();
      render(
        <MotionProvider motion="reduced">
          <PageIndicator pageCount={3} currentPage={2} {...extra} />
        </MotionProvider>,
      );
      expect(accessibilitySnapshot(screen.getByTestId("ui-lynx-page-indicator"))).toEqual(expected);
    },
  );
});
