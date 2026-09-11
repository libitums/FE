import { render, screen } from "@lynx-js/react/testing-library";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { PageIndicator } from "./index";

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
});

describe("PageIndicator dedicated CSS contract", () => {
  test("centers one horizontal row with exact dimensions, gap, and pill mapping", () => {
    expect(css).toMatch(/\.ui-lynx-page-indicator-track\s*\{[^}]*display:\s*linear/);
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
      /\.ui-lynx-page-indicator-item\s*\{[^}]*background-color:\s*var\(--libitum-color-fg-neutral-subtle\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-page-indicator-item\s*\{[^}]*border-radius:\s*var\(--libitum-radius-full\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-page-indicator-item-current\s*\{[^}]*background-color:\s*var\(--libitum-color-brand-strong\)/,
    );
    expect(css).toMatch(
      /transition:\s*width\s+var\(--libitum-motion-duration-progress\)\s+var\(--libitum-motion-easing-enter\)\s*,\s*background-color\s+var\(--libitum-motion-duration-progress\)\s+var\(--libitum-motion-easing-enter\)/,
    );
  });
});
