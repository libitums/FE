import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { backHandlers } from "../../lib/back-handler";
import { EpisodeBannerScreen } from "./EpisodeBannerScreen";
import type { EpisodeBannerKind } from "./catalog-cover.contract";
import { EPISODE_BANNER_HOLD_MS } from "./episode-banner";

// `ui` 계층: 배너 화면의 글자 · 낭독 · 시간/탭/뒤로 중 먼저 온 것에 한 번 닫힘 · 모션 변형.
// 시간은 숫자가 아니라 유지 시간 상수로 밉니다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function mount(kind: EpisodeBannerKind = "start") {
  const onDone = vi.fn<() => void>();
  const view = render(<EpisodeBannerScreen insets={insets} kind={kind} onDone={onDone} />);
  return { onDone, ...view };
}

const hold = (ms: number = EPISODE_BANNER_HOLD_MS) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const root = () => screen.getByTestId("episode-banner-screen");
const text = () => screen.getByTestId("episode-banner-screen-text");

describe("EpisodeBannerScreen", () => {
  test("[UB1] start는 Episode start!, clear는 Episode clear!를 루트의 data-kind와 함께 그린다", () => {
    mount("start");
    expect(text()).toHaveTextContent("Episode start!");
    expect(root()).toHaveAttribute("data-kind", "start");
    cleanup();

    mount("clear");
    expect(text()).toHaveTextContent("Episode clear!");
    expect(root()).toHaveAttribute("data-kind", "clear");
  });

  test("[UB2] 루트 하나가 화면 전체 조작으로 읽히고 글자는 따로 멈추지 않는다", () => {
    const { container } = mount("start");

    expect(root()).toHaveAttribute("accessibility-element", "true");
    expect(root()).toHaveAttribute("accessibility-traits", "button");
    expect(root()).toHaveAttribute("accessibility-label", "Episode start!");
    expect(text()).not.toHaveAttribute("accessibility-element");
    const traited = container.querySelectorAll("[accessibility-traits]");
    expect(Array.from(traited).map((el) => el.getAttribute("data-testid"))).toEqual([
      "episode-banner-screen",
    ]);
  });

  test("[UB3] 유지 시간 직전에는 닫히지 않고 1ms 뒤 한 번 닫힌다", () => {
    const { onDone } = mount();

    hold(EPISODE_BANNER_HOLD_MS - 1);
    expect(onDone).toHaveBeenCalledTimes(0);
    hold(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("[UB4] 시간 전에 탭하면 한 번 닫히고 그 뒤 시간이 다 흘러도 한 번이다", () => {
    const { onDone } = mount();

    fireEvent.tap(root(), {});
    expect(onDone).toHaveBeenCalledTimes(1);
    hold();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("[UB5] 시스템 뒤로도 한 번 닫히고 이어진 탭 · 시간은 더하지 않는다", () => {
    const { onDone } = mount();

    let handled = false;
    act(() => {
      handled = backHandlers.runTop();
    });
    expect(handled).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);

    fireEvent.tap(root(), {});
    hold();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("[UB6a] 탭 두 번은 한 번이다", () => {
    const { onDone } = mount();

    act(() => {
      fireEvent.tap(root(), {});
      fireEvent.tap(root(), {});
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("[UB6b] 시간 전에 언마운트하면 유지 시간이 지나도 부르지 않는다", () => {
    const { onDone, unmount } = mount();

    hold(EPISODE_BANNER_HOLD_MS - 1);
    unmount();
    hold();
    expect(onDone).toHaveBeenCalledTimes(0);
  });

  test("[UB6c] onDone이 바뀌어 재렌더해도 타이머를 다시 걸지 않고 최신 함수를 부른다", () => {
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();
    const { rerender } = render(
      <EpisodeBannerScreen insets={insets} kind="start" onDone={first} />,
    );

    hold(EPISODE_BANNER_HOLD_MS - 100);
    rerender(<EpisodeBannerScreen insets={insets} kind="start" onDone={second} />);
    hold(100);

    expect(first).toHaveBeenCalledTimes(0);
    expect(second).toHaveBeenCalledTimes(1);
  });

  test("[UB7a] 기본 모션은 reward — data-motion과 클래스", () => {
    mount();

    expect(text()).toHaveAttribute("data-motion", "reward");
    expect(text().getAttribute("class") ?? "").toContain("-motion-reward");
  });

  test("[UB7b] reduced 모션은 fade이고 재렌더해도 속성 · 클래스가 그대로다", () => {
    const onDone = vi.fn<() => void>();
    const element = (
      <MotionProvider motion="reduced">
        <EpisodeBannerScreen insets={insets} kind="start" onDone={onDone} />
      </MotionProvider>
    );
    const { rerender } = render(element);

    expect(text()).toHaveAttribute("data-motion", "fade");
    expect(text().getAttribute("class") ?? "").toContain("-motion-fade");
    expect(text().getAttribute("class") ?? "").not.toContain("-motion-reward");
    const before = text().getAttribute("class");

    rerender(element);

    expect(text()).toHaveAttribute("data-motion", "fade");
    expect(text().getAttribute("class")).toBe(before);
  });

  test("[UB9a] 상태바 아이콘 표지가 루트에 선다", () => {
    mount();

    expect(root()).toHaveAttribute("data-statusbar", "light-icons");
  });

  test("[UB9b] 여백 상자의 인라인 padding 네 변이 준 insets다", () => {
    render(
      <EpisodeBannerScreen
        insets={{ top: 11, bottom: 22, left: 33, right: 44 }}
        kind="clear"
        onDone={() => {}}
      />,
    );

    // 인라인 선언이 한 줄로 합쳐져 직렬화될 수 있어 변마다 읽습니다.
    const { style } = screen.getByTestId("episode-banner-screen-safe") as HTMLElement;
    expect(style.paddingTop).toBe("11px");
    expect(style.paddingBottom).toBe("22px");
    expect(style.paddingLeft).toBe("33px");
    expect(style.paddingRight).toBe("44px");
  });
});

function keyframesBody(css: string, nameFragment: string): string {
  const header = new RegExp(`@keyframes\\s+[\\w-]*${nameFragment}[\\w-]*\\s*\\{`).exec(css);
  if (header === null) return "";
  let depth = 1;
  let i = header.index + header[0].length;
  const start = i;
  while (i < css.length && depth > 0) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    i += 1;
  }
  return css.slice(start, i - 1);
}

function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  return match?.[1] ?? "";
}

describe("episode-banner-screen.css", () => {
  const css = () =>
    readFileSync(
      resolve(process.cwd(), "src/screens/catalog-cover/episode-banner-screen.css"),
      "utf8",
    );

  test("[UB8a] fade keyframes에는 transform이 없고 reward keyframes는 토큰 scale을 쓴다", () => {
    const fade = keyframesBody(css(), "fade");
    const reward = keyframesBody(css(), "reward");

    expect(fade).not.toBe("");
    expect(fade).not.toContain("transform");
    expect(reward).toContain("scale(var(--libitum-motion-scale-reward))");
  });

  test("[UB8b] @media와 position: fixed가 없다", () => {
    const source = css();

    expect(source).not.toContain("@media");
    expect(source).not.toMatch(/position:\s*fixed/);
  });

  test("[UB8c] 글자 규칙에 white-space · text-maxline · width · height가 없다", () => {
    const body = ruleBody(css(), ".episode-banner-screen-text");

    expect(body).not.toBe("");
    expect(body).not.toMatch(/white-space/);
    expect(body).not.toMatch(/text-maxline/);
    expect(body).not.toMatch(/(^|[\s;{])width\s*:/);
    expect(body).not.toMatch(/(^|[\s;{])height\s*:/);
  });
});
