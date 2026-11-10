import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층(MC-U29): 공용 채팅 CSS(spec §4.2) — 학습 메신저에서 옮긴 선언이 옛 값과 같고(AC15), 새 3:4 사진 ·
// 움직임 줄이기 규칙이 있는지 CSS 텍스트로 봅니다. 파일이 없으면 빈 문자열로 읽어 단언이 실패하게 합니다.

const read = (relative: string): string => {
  const path = resolve(process.cwd(), relative);
  return existsSync(path) ? readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") : "";
};

const chatCss = read("src/components/chat/chat.css");
const storyCss = read("src/screens/story-messenger/story-messenger.css");

const bodyOf = (css: string, selector: string): string =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => (match[1] ?? "").replace(/\s+/g, " ").trim() === selector)
    .map((match) => (match[2] ?? "").replace(/\s+/g, " ").trim())
    .join(" ");

describe("chat.css — 옮긴 선언 (MC-U29)", () => {
  test("MC-U29. chat.css 가 있다", () => {
    expect(chatCss).not.toBe("");
  });

  test("MC-U29. 머리 줄 최소 높이는 spacing-64 다", () => {
    expect(bodyOf(chatCss, ".chat-header-row")).toContain("min-height: var(--libitum-spacing-64)");
  });

  test("MC-U29. 머리 · 양옆 칸 · 제목", () => {
    expect(bodyOf(chatCss, ".chat-header")).toContain("flex-shrink: 0");
    expect(bodyOf(chatCss, ".chat-header-side")).toContain("width: var(--libitum-spacing-48)");
    expect(bodyOf(chatCss, ".chat-title")).toContain("text-align: center");
  });

  test("MC-U29. 로그는 남는 높이를 채운다 — .chat-log { flex: 1 }", () => {
    expect(bodyOf(chatCss, ".chat-log")).toContain("flex: 1");
    const inner = bodyOf(chatCss, ".chat-log-inner");
    expect(inner).toContain("flex-direction: column");
    expect(inner).toContain("gap: var(--libitum-spacing-12)");
  });

  test("MC-U29. 줄 · 쌓음 · 내 줄", () => {
    expect(bodyOf(chatCss, ".chat-row")).toContain("align-items: flex-start");
    expect(bodyOf(chatCss, ".chat-row-outgoing")).toContain("justify-content: flex-end");
    expect(bodyOf(chatCss, ".chat-stack")).toContain("flex-direction: column");
  });

  test("MC-U29. 사진 9:16 은 180 × 320, 3:4 는 180 × 240 이다", () => {
    const tall = bodyOf(chatCss, ".chat-photo-9x16");
    expect(tall).toContain("width: 180px");
    expect(tall).toContain("height: 320px");
    const short = bodyOf(chatCss, ".chat-photo-3x4");
    expect(short).toContain("width: 180px");
    expect(short).toContain("height: 240px");
  });

  test("MC-U29. 입력 중 점 — 애니메이션 · 지연이 예전 값 그대로다", () => {
    expect(chatCss).toMatch(/@keyframes\s+chat-dot\s*\{/);
    const dot = bodyOf(chatCss, ".chat-dot");
    expect(dot).toContain("chat-dot var(--libitum-motion-duration-d9)");
    expect(dot).toContain("var(--libitum-motion-easing-easing) infinite");
    expect(bodyOf(chatCss, ".chat-dot-2")).toContain(
      "animation-delay: var(--libitum-motion-duration-d3)",
    );
    expect(bodyOf(chatCss, ".chat-dot-3")).toContain(
      "animation-delay: var(--libitum-motion-duration-d6)",
    );
    expect(bodyOf(chatCss, ".chat-typing")).toContain("padding: var(--libitum-spacing-16)");
  });

  test("MC-U29. 움직임 줄이기 — .chat-typing-still .chat-dot 은 animation: none 이다", () => {
    expect(bodyOf(chatCss, ".chat-typing-still .chat-dot")).toContain("animation: none");
  });

  test("MC-U29. 답장 보기 면 — brand 면 · 눌림 · 고름(picked)", () => {
    expect(bodyOf(chatCss, ".chat-reply-option")).toContain(
      "background-color: var(--libitum-color-brand-primary)",
    );
    expect(bodyOf(chatCss, ".chat-reply-option:active")).toContain(
      "background-color: var(--libitum-color-brand-primary-pressed)",
    );
    // 속성 선택자는 Lynx에서 data-*(dataset)를 맞추지 않아 클래스 변형으로 바꿨습니다(device-findings-1 D1).
    expect(bodyOf(chatCss, ".chat-reply-option-picked")).toContain(
      "background-color: var(--libitum-color-brand-primary-pressed)",
    );
    expect(bodyOf(chatCss, ".chat-reply-option-primary")).toContain(
      "color: var(--libitum-color-white)",
    );
    expect(bodyOf(chatCss, ".chat-reply-option-line")).toContain(
      "color: var(--libitum-color-gray-200)",
    );
  });

  test("MC-U29. 옛 이름이 chat.css 에 남지 않는다", () => {
    expect(chatCss).not.toBe("");
    expect(chatCss).not.toContain("story-messenger");
  });
});

describe("story-messenger.css — 옮겨 간 클래스가 없다 (MC-U29)", () => {
  test("MC-U29. 학습 메신저 CSS 에서 옮긴 클래스 선언이 지워졌다", () => {
    expect(storyCss).not.toBe("");
    for (const moved of [
      ".story-messenger-header",
      ".story-messenger-header-row",
      ".story-messenger-header-side",
      ".story-messenger-title",
      ".story-messenger-log",
      ".story-messenger-log-inner",
      ".story-messenger-row",
      ".story-messenger-row-outgoing",
      ".story-messenger-stack",
      ".story-messenger-photo",
      ".story-messenger-typing",
      ".story-messenger-dot",
      ".story-messenger-dot-2",
      ".story-messenger-dot-3",
      ".story-messenger-option",
      ".story-messenger-option-ko",
      ".story-messenger-option-en",
    ]) {
      expect(bodyOf(storyCss, moved), moved).toBe("");
    }
    expect(storyCss).not.toContain("@keyframes story-messenger-dot");
    expect(storyCss).not.toContain(".story-messenger-motion-reduced .story-messenger-dot");
  });

  test("MC-U29. 학습 메신저에 남는 것 — 루트 · 푸터 · 보기 묶음 · 인용 · 입력창", () => {
    for (const kept of [
      ".story-messenger-screen",
      ".story-messenger-footer",
      ".story-messenger-options",
      ".story-messenger-quote",
      ".story-composer",
    ]) {
      expect(bodyOf(storyCss, kept), kept).not.toBe("");
    }
  });
});
