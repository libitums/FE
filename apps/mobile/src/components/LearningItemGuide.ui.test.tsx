import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../lib/back-handler";
import { learningItemGuideKinds } from "../lib/learning-item-guide";
import { lightStatusBarIcons } from "../lib/status-bar-icons";
import { UiCopyContext } from "../lib/ui-copy";
import { uiCopyEn } from "../lib/ui-copy-en";
import { LearningItemGuide } from "./LearningItemGuide";

// `ui` 계층: 안내 컴포넌트 하나의 모양 · 낭독 구조 · 안전 영역 padding · 닫기(탭 · 시스템 뒤로가기) · 스크림 · 판 CSS.
// 낭독 속성은 붙었는가까지만 봅니다 — 뒤 화면 격리 · 낭독 횟수 · 복원은 e2e E10의 몫입니다.
// 문구는 문구표를 참조합니다(값 리터럴은 `learning-item-guide-copy.unit.test.ts`의 CP7이 집니다).

function setGlobalProps(value: unknown): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
}

afterEach(() => {
  cleanup();
  setGlobalProps(undefined);
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

const cssPath = (name: string) => resolve(process.cwd(), "src/components", name);
const stripCssComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const words = (className: string | null) => (className ?? "").split(/\s+/).filter(Boolean);
// 내용 상자는 계약이 고정한 클래스(`first-unit-guide-content`)로 찾는다.
const contentBox = (kind: string): HTMLElement => {
  const box = screen
    .getByTestId(`learning-item-guide-${kind}`)
    .querySelector('[class~="first-unit-guide-content"]');
  expect(box, "first-unit-guide-content").not.toBeNull();
  return box as HTMLElement;
};

// 테스트 환경이 인라인 padding을 한 줄 줄임 표기(`padding: 59px 0px 34px`)로 돌려주므로 longhand와
// 줄임 표기를 모두 위 · 오른쪽 · 아래 · 왼쪽 네 값으로 풀어 비교합니다.
const paddingOf = (el: HTMLElement) => {
  const style = el.getAttribute("style") ?? "";
  const side = (name: string) =>
    new RegExp(`(?:^|;)\\s*padding-${name}\\s*:\\s*([^;]+)`).exec(style)?.[1]?.trim();
  const short = /(?:^|;)\s*padding\s*:\s*([^;]+)/.exec(style)?.[1]?.trim().split(/\s+/);
  const [t, r = t, b = t, l = r] = short ?? [];
  return {
    top: side("top") ?? t,
    right: side("right") ?? r,
    bottom: side("bottom") ?? b,
    left: side("left") ?? l,
  };
};

test.each(learningItemGuideKinds)(
  "[LG1] %s: 루트 testid · learning-item-guide 클래스, first-unit-guide 클래스는 없다",
  (kind) => {
    render(<LearningItemGuide kind={kind} onDismiss={() => {}} />);

    const root = screen.getByTestId(`learning-item-guide-${kind}`);
    const classes = words(root.getAttribute("class"));
    expect(classes).toContain("learning-item-guide");
    // 낱말 단위 — `first-unit-guide-content`는 안쪽 요소의 클래스다.
    expect(classes).not.toContain("first-unit-guide");
    expect(words(contentBox(kind).getAttribute("class"))).toContain("first-unit-guide-content");
  },
);

test("[LG2] 표지(data-statusbar=light-icons)는 안내 루트 하나뿐이고 스크림에는 없다", () => {
  render(<LearningItemGuide kind="messenger" onDismiss={() => {}} />);

  const markers = Array.from(
    document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`),
  );
  expect(markers).toHaveLength(1);
  expect(markers[0]).toBe(screen.getByTestId("learning-item-guide-messenger"));
  expect(screen.getByTestId("ui-lynx-overlay")).not.toHaveAttribute("data-statusbar");
});

test.each(learningItemGuideKinds)("[LG3] %s: 제목 · 설명 글자가 문구표의 값이다", (kind) => {
  render(<LearningItemGuide kind={kind} onDismiss={() => {}} />);

  expect(screen.getByTestId("learning-item-guide-title")).toHaveTextContent(
    uiCopyEn.learningItemGuide[kind].title,
  );
  expect(screen.getByTestId("learning-item-guide-description")).toHaveTextContent(
    uiCopyEn.learningItemGuide[kind].description,
  );
});

test("[LG3] 문구표를 덮어쓴 Provider 아래에서는 덮어쓴 값이 선다", () => {
  const overridden = {
    ...uiCopyEn,
    learningItemGuide: {
      ...uiCopyEn.learningItemGuide,
      writing: { title: "⟦제목⟧", description: "⟦설명⟧" },
    },
  };
  render(
    <UiCopyContext.Provider value={overridden}>
      <LearningItemGuide kind="writing" onDismiss={() => {}} />
    </UiCopyContext.Provider>,
  );

  expect(screen.getByTestId("learning-item-guide-title")).toHaveTextContent("⟦제목⟧");
  expect(screen.getByTestId("learning-item-guide-description")).toHaveTextContent("⟦설명⟧");
});

test("[LG4] 내용 상자는 button 낭독 요소 하나이고 exclusive-focus가 문서에서 이 상자 하나에만 있다", () => {
  render(<LearningItemGuide kind="speaking" onDismiss={() => {}} />);

  // ui는 속성이 붙었는가까지만 봅니다. 뒤 화면 격리 · 복원은 이 테스트로 판정되지 않고
  // 기기의 e2e E10이 판정합니다(ui green을 접근성 통과로 읽지 않습니다).
  const copy = uiCopyEn.learningItemGuide.speaking;
  const content = contentBox("speaking");
  expect(content).toHaveAttribute("accessibility-element", "true");
  expect(content).toHaveAttribute("accessibility-traits", "button");
  expect(content).toHaveAttribute(
    "accessibility-label",
    `${copy.title}. ${copy.description} ${uiCopyEn.episodeIntro.guide.continue}`,
  );
  expect(content).toHaveAttribute("accessibility-exclusive-focus", "true");
  const holders = Array.from(document.querySelectorAll("[accessibility-exclusive-focus]"));
  expect(holders).toHaveLength(1);
  expect(holders[0]).toBe(content);
});

test("[LG5] 루트를 탭하면 onDismiss 1회, 내용 상자를 탭해도 1회(루트로 올라온다)", () => {
  const onDismiss = vi.fn<() => void>();
  render(<LearningItemGuide kind="phone-call" onDismiss={onDismiss} />);

  fireEvent.tap(screen.getByTestId("learning-item-guide-phone-call"), { eventType: "catchEvent" });
  expect(onDismiss).toHaveBeenCalledTimes(1);

  const content = contentBox("phone-call");
  fireEvent.tap(content, { eventType: "catchEvent" });
  expect(onDismiss).toHaveBeenCalledTimes(2);
});

test("[LG6] 떠 있는 동안 시스템 뒤로가기가 닫기를 부르고, 언마운트 뒤에는 처리할 것이 없다", () => {
  const onDismiss = vi.fn<() => void>();
  const view = render(<LearningItemGuide kind="visual-novel" onDismiss={onDismiss} />);

  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  expect(handled).toBe(true);
  expect(onDismiss).toHaveBeenCalledTimes(1);

  view.unmount();
  expect(backHandlers.runTop()).toBe(false);
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test("[LG7] learning-item-guide.css: 스크림 규칙이 rgba(26, 28, 32, 0.8) 한 곳에만 있다", () => {
  const path = cssPath("learning-item-guide.css");
  // 파일이 없으면 읽기 실패가 아니라 이 단언의 실패로 받는다.
  expect(existsSync(path), `${path}가 있어야 한다`).toBe(true);

  const css = stripCssComments(readFileSync(path, "utf8"));
  const rule = /\.learning-item-guide\s+\.ui-lynx-overlay\s*\{([^}]*)\}/.exec(css);
  expect(rule, ".learning-item-guide .ui-lynx-overlay 규칙").not.toBeNull();
  const background = /background-color\s*:\s*([^;]+);/.exec(rule?.[1] ?? "");
  expect(background?.[1]?.replace(/\s+/g, "")).toBe("rgba(26,28,32,0.8)");
  expect(css.match(/0\.8/g) ?? []).toHaveLength(1);
});

test("[LG8] first-unit-guide.css: 기존 스크림은 0.6 그대로이고 새 안내를 모른다", () => {
  const raw = readFileSync(cssPath("first-unit-guide.css"), "utf8");
  const css = stripCssComments(raw);
  const rule = /\.first-unit-guide\s+\.ui-lynx-overlay[^{]*\{([^}]*)\}/.exec(css);
  expect(rule, ".first-unit-guide .ui-lynx-overlay 규칙").not.toBeNull();
  const background = /background-color\s*:\s*([^;]+);/.exec(rule?.[1] ?? "");
  expect(background?.[1]?.replace(/\s+/g, "")).toBe("rgba(26,28,32,0.6)");
  expect(raw).not.toContain("learning-item-guide");
});

test("[LG9] LearningItemGuide.tsx 원문에 색 값(0.8 · 0.9 · rgba( · background 선언)이 없다", () => {
  const source = readFileSync(cssPath("LearningItemGuide.tsx"), "utf8");

  // 스크림과 판의 색은 learning-item-guide.css 한 곳에만 있습니다(인라인 padding은 계약이라 허용).
  expect(source).not.toContain("0.8");
  expect(source).not.toContain("0.9");
  expect(source).not.toContain("rgba(");
  // 원문에 `"background only"` 지시문이 있어 낱말 `background`가 아니라 CSS 선언 꼴을 봅니다.
  expect(source).not.toMatch(/background(-[a-z]+)?\s*[:=]/);
});

test("[LG10] 안쪽 글자 셋은 낭독 요소가 아니고, 안내 안의 낭독 요소는 내용 상자 하나다", () => {
  render(<LearningItemGuide kind="writing" onDismiss={() => {}} />);

  const root = screen.getByTestId("learning-item-guide-writing");
  const instruction = root.querySelector('[class~="first-unit-guide-instruction"]');
  expect(instruction, "first-unit-guide-instruction").not.toBeNull();
  for (const text of [
    screen.getByTestId("learning-item-guide-title"),
    screen.getByTestId("learning-item-guide-description"),
    instruction as Element,
  ]) {
    expect(text).toHaveAttribute("accessibility-element", "false");
  }
  const readable = Array.from(root.querySelectorAll('[accessibility-element="true"]'));
  expect(readable).toHaveLength(1);
  expect(readable[0]).toBe(contentBox("writing"));
});

test("[LG11] 전역 값의 안전 영역 inset 네 변이 루트의 인라인 padding이다", () => {
  setGlobalProps({ safeAreaInsets: { top: 59, bottom: 34, left: 0, right: 0 } });
  render(<LearningItemGuide kind="messenger" onDismiss={() => {}} />);

  expect(paddingOf(screen.getByTestId("learning-item-guide-messenger"))).toEqual({
    top: "59px",
    right: "0px",
    bottom: "34px",
    left: "0px",
  });
});

test("[LG11] 서로 다른 네 값이 제 변에 들어간다(변 바꿈 · 한 변만 주기를 잡는다)", () => {
  setGlobalProps({ safeAreaInsets: { top: 11, bottom: 22, left: 33, right: 44 } });
  render(<LearningItemGuide kind="speaking" onDismiss={() => {}} />);

  expect(paddingOf(screen.getByTestId("learning-item-guide-speaking"))).toEqual({
    top: "11px",
    right: "44px",
    bottom: "22px",
    left: "33px",
  });
});

test("[LG11] 전역 값이 없으면 padding 넷 다 0px", () => {
  setGlobalProps(undefined);
  render(<LearningItemGuide kind="visual-novel" onDismiss={() => {}} />);

  expect(paddingOf(screen.getByTestId("learning-item-guide-visual-novel"))).toEqual({
    top: "0px",
    right: "0px",
    bottom: "0px",
    left: "0px",
  });
});

test("[LG12] learning-item-guide.css: 바탕 판 규칙이 하나이고 0.9 · 둥근 모서리 토큰이다", () => {
  const path = cssPath("learning-item-guide.css");
  expect(existsSync(path), `${path}가 있어야 한다`).toBe(true);

  const css = stripCssComments(readFileSync(path, "utf8"));
  const rules = Array.from(
    css.matchAll(/\.learning-item-guide\s+\.first-unit-guide-content\s*\{([^}]*)\}/g),
  );
  expect(rules, ".learning-item-guide .first-unit-guide-content 규칙은 하나").toHaveLength(1);
  const body = rules[0]?.[1] ?? "";
  const background = /background-color\s*:\s*([^;]+);/.exec(body);
  expect(background?.[1]?.replace(/\s+/g, "")).toBe("rgba(26,28,32,0.9)");
  const radius = /border-radius\s*:\s*([^;]+);/.exec(body);
  expect(radius?.[1]?.trim().startsWith("var(--libitum-radius-")).toBe(true);
  expect(css.match(/0\.9/g) ?? []).toHaveLength(1);
});

test("[LG12] first-unit-guide.css: 기존 안내의 내용 상자 규칙에 배경이 없다", () => {
  const css = stripCssComments(readFileSync(cssPath("first-unit-guide.css"), "utf8"));
  const rule = /(?:^|\})\s*\.first-unit-guide-content\s*\{([^}]*)\}/.exec(css);
  expect(rule, ".first-unit-guide-content 규칙").not.toBeNull();
  expect(rule?.[1]).not.toContain("background");
});

test.each(learningItemGuideKinds)(
  "[LG13] %s: 안내 안에서 style 속성을 가진 요소는 루트 하나이고 선언은 padding 넷뿐이다",
  (kind) => {
    setGlobalProps({ safeAreaInsets: { top: 59, bottom: 34, left: 0, right: 0 } });
    render(<LearningItemGuide kind={kind} onDismiss={() => {}} />);

    const root = screen.getByTestId(`learning-item-guide-${kind}`);
    const styled = [root, ...Array.from(root.querySelectorAll("*"))].filter((el) =>
      el.hasAttribute("style"),
    );
    expect(styled).toHaveLength(1);
    expect(styled[0]).toBe(root);

    // 테스트 환경이 padding 넷을 한 줄 줄임 표기로 돌려주므로(LG11 주석) `padding`은 네 변으로 푼다.
    const names = new Set(
      (root.getAttribute("style") ?? "")
        .split(";")
        .map((piece) => piece.trim())
        .filter(Boolean)
        .map((declaration) => declaration.split(":")[0]?.trim().toLowerCase() ?? "")
        .flatMap((name) =>
          name === "padding"
            ? ["padding-top", "padding-right", "padding-bottom", "padding-left"]
            : [name],
        ),
    );
    expect(names).toEqual(
      new Set(["padding-top", "padding-right", "padding-bottom", "padding-left"]),
    );
  },
);
