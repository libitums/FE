import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ProgressHeader } from "./ProgressHeader";

const props = {
  title: "새 에피소드",
  activity: "다운로드 중",
  progress: 42.5,
  exitAccessibilityLabel: "다운로드 닫기",
  onExit: vi.fn<() => void>(),
} as const;

describe("ProgressHeader UI contract", () => {
  test("title, activity, percentage를 렌더하고 title header trait을 제공한다", () => {
    render(<ProgressHeader {...props} />);

    expect(screen.getByTestId("ui-lynx-progress-header-title")).toHaveTextContent(props.title);
    expect(screen.getByTestId("ui-lynx-progress-header-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
    expect(screen.getByTestId("ui-lynx-progress-header-activity")).toHaveTextContent(
      props.activity,
    );
    expect(screen.getByTestId("ui-lynx-progress-header-percentage")).toHaveTextContent("42.5%");
  });

  test("root에 normalized progress와 motion을 노출한다", () => {
    render(<ProgressHeader {...props} progress={25} motion="reduced" />);

    const root = screen.getByTestId("ui-lynx-progress-header");
    expect(root).toHaveAttribute("data-progress", "25");
    expect(root).toHaveAttribute("data-motion", "reduced");
  });

  test("exit control은 접근성 이름과 button trait을 갖고 disabled 속성은 없다", () => {
    render(<ProgressHeader {...props} />);

    const exit = screen.getByTestId("ui-lynx-progress-header-exit");
    expect(exit).toHaveAttribute("accessibility-element", "true");
    expect(exit).toHaveAttribute("accessibility-label", props.exitAccessibilityLabel);
    expect(exit).toHaveAttribute("accessibility-traits", "button");
    expect(exit).not.toHaveAttribute("disabled");
    expect(exit).not.toHaveAttribute("data-disabled");
  });

  test.each([1, 2, 5])("exit tap %i회는 callback을 같은 횟수만큼 호출한다", (count) => {
    const onExit = vi.fn<() => void>();
    render(<ProgressHeader {...props} onExit={onExit} />);
    const exit = screen.getByTestId("ui-lynx-progress-header-exit");

    for (let index = 0; index < count; index += 1) fireEvent.tap(exit, {});
    expect(onExit).toHaveBeenCalledTimes(count);
  });

  test("0 progress는 fill node를 만들지 않는다", () => {
    render(<ProgressHeader {...props} progress={0} />);
    expect(screen.queryByTestId("ui-lynx-progress-header-fill")).not.toBeInTheDocument();
  });

  test("양수 progress는 fill node와 백분율 width를 제공한다", () => {
    render(<ProgressHeader {...props} progress={0.1} />);
    expect(screen.getByTestId("ui-lynx-progress-header-fill")).toHaveStyle({ width: "0.1%" });
  });

  test("음수 progress를 0으로 clamp하고 fill을 만들지 않는다", () => {
    render(<ProgressHeader {...props} progress={-20} />);
    const root = screen.getByTestId("ui-lynx-progress-header");
    expect(root).toHaveAttribute("data-progress", "0");
    expect(screen.getByTestId("ui-lynx-progress-header-percentage")).toHaveTextContent("0%");
    expect(screen.queryByTestId("ui-lynx-progress-header-fill")).not.toBeInTheDocument();
  });

  test.each([
    [150, "100%", "100"],
    [Number.POSITIVE_INFINITY, "100%", "100"],
  ])("upper progress %s를 100으로 clamp한다", (progress, label, data) => {
    render(<ProgressHeader {...props} progress={progress} />);
    const root = screen.getByTestId("ui-lynx-progress-header");
    expect(root).toHaveAttribute("data-progress", data);
    expect(screen.getByTestId("ui-lynx-progress-header-percentage")).toHaveTextContent(label);
    expect(screen.getByTestId("ui-lynx-progress-header-fill")).toHaveStyle({ width: "100%" });
  });

  test("caption은 하나의 accessibility label을 제공하고 시각적 children을 숨긴다", () => {
    render(<ProgressHeader {...props} progress={42.5} />);
    const caption = screen.getByTestId("ui-lynx-progress-header-caption");
    expect(caption).toHaveAttribute("accessibility-element", "true");
    expect(caption).toHaveAttribute("accessibility-label", "다운로드 중, 42.5%");
    expect(caption).not.toHaveAttribute("accessibility-elements-hidden");

    const content = screen.getByTestId("ui-lynx-progress-header-caption-content");
    expect(content).toHaveAttribute("accessibility-elements-hidden", "true");
    expect(content).toHaveTextContent("다운로드 중");
    expect(content).toHaveTextContent("42.5%");
  });

  test("고정밀 progress는 fill 정밀도를 유지하고 보이는 label만 한 자리로 제한한다", () => {
    render(<ProgressHeader {...props} progress={33.33333333333333} />);

    expect(screen.getByTestId("ui-lynx-progress-header-fill")).toHaveStyle({
      width: "33.33333333333333%",
    });
    expect(screen.getByTestId("ui-lynx-progress-header-percentage")).toHaveTextContent("33.3%");
    expect(screen.getByTestId("ui-lynx-progress-header-caption")).toHaveAttribute(
      "accessibility-label",
      "다운로드 중, 33.3%",
    );
  });
});

describe("ProgressHeader CSS contract", () => {
  const css = readFileSync(resolve(import.meta.dirname, "progress-header.css"), "utf8");

  test("container, title row, exit, icon, track, fill, caption, title tokens를 고정한다", () => {
    const titleBlock = css.match(/\.ui-lynx-progress-header-title\s*\{[^}]*\}/)?.[0] ?? "";
    const titleRowBlock = css.match(/\.ui-lynx-progress-header-title-row\s*\{[^}]*\}/)?.[0] ?? "";
    expect(css).toMatch(
      /\.ui-lynx-progress-header\s*\{[\s\S]*margin:\s*0\s+var\(--libitum-layout-screen-padding-x\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-progress-header\s*\{[\s\S]*padding:\s*var\(--libitum-spacing-16\)/,
    );
    expect(css).toMatch(/background-color:\s*var\(--libitum-color-background-secondary\)/);
    expect(css).toMatch(/border-radius:\s*var\(--libitum-radius-md\)/);
    expect(titleRowBlock).toMatch(/position:\s*relative/);
    expect(titleRowBlock).toMatch(/min-height:\s*var\(--libitum-spacing-48\)/);
    expect(titleRowBlock).toMatch(/padding:\s*0\s+var\(--libitum-spacing-48\)/);
    expect(titleBlock).toMatch(/text-align:\s*center/);
    expect(titleBlock).not.toMatch(/white-space:\s*nowrap/);
    expect(titleBlock).not.toMatch(/overflow:\s*hidden/);
    expect(titleBlock).not.toMatch(/text-overflow:\s*ellipsis/);
    expect(css).toMatch(
      /\.ui-lynx-progress-header-exit[\s\S]*position:\s*absolute[\s\S]*top:\s*0[\s\S]*width:\s*var\(--libitum-spacing-48\)[\s\S]*height:\s*var\(--libitum-spacing-48\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-progress-header-exit-icon[\s\S]*width:\s*var\(--libitum-icon-size-md\)[\s\S]*height:\s*var\(--libitum-icon-size-md\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-progress-header-track[\s\S]*height:\s*var\(--libitum-spacing-8\)[\s\S]*background-color:\s*var\(--libitum-color-gray-300\)[\s\S]*border-radius:\s*var\(--libitum-radius-full\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-progress-header-fill[\s\S]*min-width:\s*var\(--libitum-spacing-8\)[\s\S]*background-color:\s*var\(--libitum-color-brand-primary\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-progress-header-caption[\s\S]*margin-top:\s*var\(--libitum-spacing-8\)/,
    );
    expect(css).toMatch(
      /font-family:\s*var\(--libitum-typography-label-s-font-family\)[\s\S]*font-size:\s*var\(--libitum-typography-label-s-font-size\)[\s\S]*font-weight:\s*var\(--libitum-typography-label-s-font-weight\)[\s\S]*line-height:\s*var\(--libitum-typography-label-s-line-height\)[\s\S]*letter-spacing:\s*var\(--libitum-typography-label-s-letter-spacing\)[\s\S]*color:\s*var\(--libitum-color-fg-neutral-muted\)/,
    );
    expect(css).toMatch(
      /font-family:\s*var\(--libitum-typography-heading-s-font-family\)[\s\S]*font-size:\s*var\(--libitum-typography-heading-s-font-size\)[\s\S]*font-weight:\s*var\(--libitum-typography-heading-s-font-weight\)[\s\S]*line-height:\s*var\(--libitum-typography-heading-s-line-height\)[\s\S]*letter-spacing:\s*var\(--libitum-typography-heading-s-letter-spacing\)[\s\S]*color:\s*var\(--libitum-color-fg-neutral\)/,
    );
  });

  test("motion, focus ring, reduced-motion, crossfade 계약을 고정한다", () => {
    expect(css).toMatch(
      /transition:\s*width\s+var\(--libitum-motion-duration-progress\)\s+var\(--libitum-motion-easing-enter\)/,
    );
    expect(css).toMatch(
      /:focus[\s\S]*box-shadow[\s\S]*var\(--libitum-stroke-width-strong\)[\s\S]*var\(--libitum-color-white\)[\s\S]*var\(--libitum-spacing-4\)[\s\S]*var\(--libitum-color-border-strong\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-progress-header-motion-reduced \.ui-lynx-progress-header-fill\s*\{[\s\S]*transition:\s*none/,
    );
    expect(css).toMatch(
      /\.ui-lynx-progress-header-exit[\s\S]*transition:[^;]*opacity[^;]*var\(--libitum-motion-duration-color\)[^;]*var\(--libitum-motion-easing-easing\)/,
    );
    expect(css).toMatch(
      /\.ui-lynx-progress-header-motion-reduced \.ui-lynx-progress-header-exit[\s\S]*transition:[^;]*opacity[^;]*var\(--libitum-motion-duration-d2\)[^;]*var\(--libitum-motion-easing-linear\)/,
    );
  });
});
