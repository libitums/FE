import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";
import { color } from "@libitums/design-tokens";

import { clearBackHandlers } from "./chat-ui.test-support";
import { editorCapsOf } from "./my-story-editor";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { PICKED, wordChoice } from "./my-stories.test-support";
import { MyStoryEditor } from "./MyStoryEditor";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";

// `ui` 계층(MS-EE1 ~ EE4, 2026-11-26 사용자 요청): 스토리 만들기도 스토리 보기처럼 화면 끝까지(edge-to-edge) — 머리 줄에 바탕을 두지
// 않고 색 · 사진 바탕이 상태 표시줄 아래까지 깔리며, 누를 것(뒤로 · 색 고르기 · 도구)은 안전 영역 안쪽 자리를 지킵니다. 어떤 바탕
// 위에서도 보이게 둥근 단추는 어두운 반투명 원 + 흰 그림(WCAG 비텍스트 3:1), 사진이면 위에 어두운 그라데이션 · 밝은 상태 표시줄 아이콘.

const TOP = 59;

afterEach(() => {
  cleanup();
  clearBackHandlers();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
});

function mount(photo: boolean) {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = {
    safeAreaInsets: { top: TOP, bottom: 34, left: 0, right: 0 },
  };
  render(
    <MyStoryEditor
      caps={editorCapsOf(["text", "word"])}
      choices={() => ({ words: [wordChoice("w1", "김치찌개", "kimchi stew")] })}
      photo={photo && PICKED.status === "picked" ? PICKED.photo : null}
      sharing={{
        busy: false,
        checking: false,
        error: null,
        crisis: null,
        rejected: null,
        share: vi.fn(async () => undefined),
        requestReview: vi.fn(async () => undefined),
        reset: vi.fn(),
      }}
      onShare={vi.fn()}
      onChange={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

/** 레이아웃상 부모 — ReactLynx가 조건부 자리에 두는 `wrapper`(레이아웃에 끼지 않음)는 건너뜁니다. */
function layoutParentOf(el: Element): Element | null {
  let parent = el.parentElement;
  while (parent !== null && parent.tagName.toLowerCase() === "wrapper")
    parent = parent.parentElement;
  return parent;
}

/** `my-stories.css`의 한 규칙 본문(주석 뺌). */
function ruleOf(selector: string): string {
  const css = readFileSync(resolve(__dirname, "my-stories.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found = new RegExp(`(?:^|\\}|,)\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  if (found === null) throw new Error(`no rule ${selector}`);
  return found[1] ?? "";
}

test("MS-EE1. 색 바탕 — 바탕 칠은 화면 맨 위부터(편집 층), 내용은 위 안전 영역만큼 내려오고 머리 줄에는 바탕이 없다", () => {
  mount(false);
  const editor = screen.getByTestId(ids.editor);
  expect(editor.getAttribute("class")).toContain("my-story-bg-orange");
  expect(editor.getAttribute("style")).toMatch(/padding-top:\s*59px/);
  expect(ruleOf(".my-story-editor")).toMatch(/top:\s*0/);
  expect(ruleOf(".my-story-editor-top")).not.toMatch(/background/);
  // 밝은 색 바탕 — 상태 표시줄 아이콘은 기본(어두운) 그대로, 그라데이션 없음.
  expect(editor.getAttribute("data-statusbar")).not.toBe(lightStatusBarIcons);
  expect(screen.queryByTestId(ids.editorShade)).toBeNull();
});

test("MS-EE2. 뒤로 · 색 고르기 · 도구 단추는 어두운 반투명 원 + 흰 그림 — 밝은 색 · 밝은 사진 위에서도 3:1", () => {
  mount(false);
  const dark = /background-color:\s*rgba\(0,\s*0,\s*0,\s*0\.45\)/;
  expect(ruleOf(".my-story-editor-round")).toMatch(dark);
  expect(ruleOf(".my-story-swatches")).toMatch(dark);
  expect(ruleOf(".my-story-tool-icon")).toMatch(dark);
  expect(ruleOf(".my-story-swatch-on")).toMatch(/border-color:\s*var\(--libitum-color-white\)/);
  expect(ruleOf(".my-story-tool-aa")).toMatch(/color:\s*var\(--libitum-color-white\)/);
  const back = screen.getByTestId(ids.composerClose);
  expect(back.getAttribute("class")).toContain("my-story-editor-round");
  const icons = [back, screen.getByTestId(ids.toolWords)].map((each) =>
    each.querySelector("svg")?.getAttribute("current-color"),
  );
  expect(icons).toEqual([color.white, color.white]);
});

test("MS-EE3. 사진 바탕 — 사진이 캔버스가 아니라 편집 층 전체(상태 표시줄 아래까지)에 깔리고, 위에 어두운 그라데이션 · 밝은 아이콘", () => {
  mount(true);
  const editor = screen.getByTestId(ids.editor);
  const photo = screen.getByTestId(ids.editorPhoto);
  expect(layoutParentOf(photo) === editor).toBe(true);
  expect(screen.getByTestId(ids.stickers).contains(photo)).toBe(false);
  // 표지는 사진일 때만 그리는 그늘이 답니다(등록부 `my-stories.css` carrier — 조건식 값은 금지).
  const shade = screen.getByTestId(ids.editorShade);
  expect(shade.getAttribute("data-statusbar")).toBe(lightStatusBarIcons);
  expect(shade.getAttribute("style")).toMatch(new RegExp(`height:\\s*${TOP + 120}px`));
  expect(ruleOf(".my-story-editor-shade")).toMatch(/linear-gradient/);
  // 사진 위 도구 이름은 흰 글자(그림자) — 어두운 글자는 어두운 사진에서 사라집니다.
  expect(ruleOf(".my-story-photo-bg .my-story-tool-text")).toMatch(
    /color:\s*var\(--libitum-color-white\)/,
  );
});

test("MS-EE4. 사진 바탕도 내용은 위 안전 영역 안쪽 — 편집 층 위 여백 = 인셋, 그리는 순서는 사진 → 그라데이션 → 머리 줄(뒤로가 맨 위)", () => {
  mount(true);
  const editor = screen.getByTestId(ids.editor);
  expect(editor.getAttribute("style")).toMatch(/padding-top:\s*59px/);
  const photo = screen.getByTestId(ids.editorPhoto);
  const shade = screen.getByTestId(ids.editorShade);
  const back = screen.getByTestId(ids.composerClose);
  expect(layoutParentOf(shade) === editor).toBe(true);
  const follows = (a: Element, b: Element) =>
    (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  expect([follows(photo, shade), follows(shade, back)]).toEqual([true, true]);
});
