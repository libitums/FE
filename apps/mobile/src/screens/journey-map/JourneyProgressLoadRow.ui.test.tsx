import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { JourneyProgressLoadRow } from "./JourneyProgressLoadRow";

// `ui` 계층: 진행 불러오기 줄 — 로딩 · 실패 변형, 낭독 횟수, 동작 줄이기. 낭독 규칙 자체는 순수 함수
// unit이 지므로 여기서는 컴포넌트가 그 규칙대로 실제로 부르는 횟수만 셉니다.

const copy = uiCopyEn.progressLoad;
const noop = (): void => {};

let announced: string[] = [];

beforeEach(() => {
  announced = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }) => void announced.push(args.content),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const root = () => screen.getByTestId("journey-progress-load-row");
const retryButton = () =>
  screen
    .getByTestId("journey-progress-load-row-retry")
    .querySelector('[data-testid="ui-lynx-button"]');

describe("JourneyProgressLoadRow", () => {
  test("LR1. loading은 스피너와 로딩 문구를 그리고 버튼은 없다", () => {
    render(<JourneyProgressLoadRow status="loading" />);

    expect(root()).toHaveAttribute("data-status", "loading");
    expect(screen.getByTestId("journey-progress-load-row-spinner")).toBeInTheDocument();
    expect(screen.getByTestId("journey-progress-load-row-message")).toHaveTextContent(copy.loading);
    expect(screen.queryByTestId("journey-progress-load-row-retry")).not.toBeInTheDocument();
  });

  test("LR2. failed는 스피너 없이 실패 문구와 다시 시도 버튼을 그린다", () => {
    render(<JourneyProgressLoadRow status="failed" onRetry={noop} />);

    expect(root()).toHaveAttribute("data-status", "failed");
    expect(screen.queryByTestId("journey-progress-load-row-spinner")).not.toBeInTheDocument();
    expect(screen.getByTestId("journey-progress-load-row-message")).toHaveTextContent(copy.failed);
    const button = within(screen.getByTestId("journey-progress-load-row-retry")).getByTestId(
      "ui-lynx-button",
    );
    expect(button).toHaveAttribute("accessibility-label", copy.retry);
  });

  test("LR3. 버튼을 탭하면 onRetry가 한 번 불린다", () => {
    const onRetry = vi.fn<() => void>();
    render(<JourneyProgressLoadRow status="failed" onRetry={onRetry} />);

    fireEvent.tap(retryButton()!, {});

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("LR4. failed에서 loading으로 바뀌면 버튼이 사라지고 스피너가 선다", () => {
    const { rerender } = render(<JourneyProgressLoadRow status="failed" onRetry={noop} />);

    rerender(<JourneyProgressLoadRow status="loading" />);

    expect(screen.queryByTestId("journey-progress-load-row-retry")).not.toBeInTheDocument();
    expect(screen.getByTestId("journey-progress-load-row-spinner")).toBeInTheDocument();
  });

  test("LR5. loading이 서면 로딩 문구를 한 번 낭독한다", () => {
    render(<JourneyProgressLoadRow status="loading" />);

    expect(announced).toEqual([copy.loadingAnnouncement]);
  });

  test("LR6. loading에서 failed로 바뀌면 실패 문구를 한 번 더 낭독한다", () => {
    const { rerender } = render(<JourneyProgressLoadRow status="loading" />);

    rerender(<JourneyProgressLoadRow status="failed" onRetry={noop} />);

    expect(announced).toHaveLength(2);
    expect(announced[1]).toBe(copy.failed);
  });

  test("LR7. 같은 props 리렌더와 onRetry만 바뀐 리렌더는 다시 낭독하지 않는다", () => {
    const first = vi.fn<() => void>();
    const { rerender } = render(<JourneyProgressLoadRow status="failed" onRetry={first} />);

    for (let i = 0; i < 3; i += 1) {
      rerender(<JourneyProgressLoadRow status="failed" onRetry={first} />);
    }
    rerender(<JourneyProgressLoadRow status="failed" onRetry={vi.fn<() => void>()} />);

    expect(announced).toEqual([copy.failed]);
  });

  test("LR8. failed에서 재시도(loading)로 가면 로딩 문구를, 다시 failed가 되면 실패 문구를 한 번씩 낭독한다", () => {
    const { rerender } = render(<JourneyProgressLoadRow status="failed" onRetry={noop} />);

    rerender(<JourneyProgressLoadRow status="loading" />);
    expect(announced).toEqual([copy.failed, copy.loadingAnnouncement]);

    rerender(<JourneyProgressLoadRow status="failed" onRetry={noop} />);
    expect(announced).toEqual([copy.failed, copy.loadingAnnouncement, copy.failed]);
  });

  test("LR9. reduced면 루트에 data-motion이 있고 standard면 속성이 없다", () => {
    const reduced = render(
      <MotionProvider motion="reduced">
        <JourneyProgressLoadRow status="loading" />
      </MotionProvider>,
    );
    expect(root()).toHaveAttribute("data-motion", "reduced");
    reduced.unmount();

    render(
      <MotionProvider motion="standard">
        <JourneyProgressLoadRow status="loading" />
      </MotionProvider>,
    );
    expect(root().hasAttribute("data-motion")).toBe(false);
  });

  test("LR9. CSS — animation은 reduced 선택자 밖에서만 걸리고 길이 · 가속은 모션 토큰이다", () => {
    const css = readFileSync(join(__dirname, "journey-progress-load-row.css"), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
      selector: (match[1] ?? "").trim(),
      body: match[2] ?? "",
    }));
    const animated = rules.filter((rule) => /(^|[;\s])animation(-[a-z-]+)?\s*:/.test(rule.body));

    expect(animated.length).toBeGreaterThan(0);
    for (const rule of animated) {
      expect(rule.selector).not.toMatch(/reduced|data-motion/);
      expect(rule.body).toMatch(/var\(--libitum-motion-duration-[a-z0-9-]+\)/);
      expect(rule.body).toMatch(/var\(--libitum-motion-easing-[a-z0-9-]+\)/);
      expect(rule.body).not.toMatch(/\b\d+(\.\d+)?m?s\b/);
    }
  });

  test("LR10. loading의 루트는 접근성 요소 하나이고 이름이 낭독용 로딩 문구다 · failed는 문구 요소가 이름을 낸다", () => {
    const loading = render(<JourneyProgressLoadRow status="loading" />);
    expect(root()).toHaveAttribute("accessibility-element", "true");
    expect(root()).toHaveAttribute("accessibility-label", copy.loadingAnnouncement);
    loading.unmount();

    render(<JourneyProgressLoadRow status="failed" onRetry={noop} />);
    const message = screen.getByTestId("journey-progress-load-row-message");
    expect(message).toHaveTextContent(copy.failed);
    expect(message).not.toHaveAttribute("accessibility-label");
    expect(root()).not.toHaveAttribute("accessibility-element", "true");
  });

  test("LR12. loading과 failed를 오가도 루트는 같은 노드다(등장 페이드를 다시 틀지 않는다)", () => {
    const { rerender } = render(<JourneyProgressLoadRow status="loading" />);
    const first = root();

    rerender(<JourneyProgressLoadRow status="failed" onRetry={noop} />);
    expect(root()).toBe(first);
    rerender(<JourneyProgressLoadRow status="loading" />);
    expect(root()).toBe(first);
  });

  test("LR13. obscured면 재시도 래퍼가 낭독에서 가려지고, 아니면 속성은 있되 값이 false다", () => {
    const { rerender } = render(<JourneyProgressLoadRow status="failed" onRetry={noop} />);
    const retry = () => screen.getByTestId("journey-progress-load-row-retry");
    expect(retry()).toHaveAttribute("accessibility-elements-hidden", "false");

    rerender(<JourneyProgressLoadRow status="failed" onRetry={noop} obscured />);
    expect(retry()).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  test("LR11. 낭독 모듈이 없어도 던지지 않고 그린다", () => {
    vi.unstubAllGlobals();

    const loading = render(<JourneyProgressLoadRow status="loading" />);
    expect(root()).toHaveAttribute("data-status", "loading");
    loading.unmount();

    render(<JourneyProgressLoadRow status="failed" onRetry={noop} />);
    expect(root()).toHaveAttribute("data-status", "failed");
  });
});
