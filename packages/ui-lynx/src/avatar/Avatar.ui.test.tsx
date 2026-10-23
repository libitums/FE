import { color } from "@libitums/design-tokens";
import user from "@libitums/icons/lynx/user";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { Avatar } from "./Avatar";

function dispatchImageEvent(type: "load" | "error") {
  const imageRef = lynx.createSelectorQuery().select('[data-testid="ui-lynx-avatar-image"]');
  fireEvent(imageRef as unknown as Element, new Event(`bindEvent:${type}`));
}

describe("Avatar UI", () => {
  test("전체 이름을 접근성 이름으로 제공하고 Initials 자손은 숨긴다", () => {
    render(<Avatar name="Kim Ray" size="sm" />);

    const avatar = screen.getByTestId("ui-lynx-avatar");
    expect(avatar).toHaveClass("ui-lynx-avatar-sm", "ui-lynx-avatar-content-initials");
    expect(avatar).toHaveAttribute("data-content", "initials");
    expect(avatar).toHaveAttribute("accessibility-element", "true");
    expect(avatar).toHaveAttribute("accessibility-label", "Kim Ray");
    expect(avatar).toHaveAttribute("accessibility-traits", "image");
    expect(avatar).toHaveAttribute("focusable", "false");
    expect(avatar).not.toHaveAttribute("bindtap");
    expect(screen.getByTestId("ui-lynx-avatar-initials")).toHaveTextContent("KR");
    expect(screen.getByTestId("ui-lynx-avatar-initials")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
  });

  test("Image는 aspectFill로 로드하고 성공 전까지 Initials를 유지한다", () => {
    render(<Avatar imageSource="https://example.com/avatar.png" name="김말랑" size="lg" />);

    const image = screen.getByTestId("ui-lynx-avatar-image");
    expect(image.tagName.toLowerCase()).toBe("image");
    expect(image).toHaveAttribute("src", "https://example.com/avatar.png");
    expect(image).toHaveAttribute("mode", "aspectFill");
    expect(image).toHaveClass("ui-lynx-avatar-image-loading");
    expect(screen.getByTestId("ui-lynx-avatar")).toHaveAttribute("data-content", "initials");

    dispatchImageEvent("load");
    expect(screen.getByTestId("ui-lynx-avatar")).toHaveAttribute("data-content", "image");
    expect(screen.getByTestId("ui-lynx-avatar-image")).toHaveClass("ui-lynx-avatar-image-loaded");
    expect(screen.queryByTestId("ui-lynx-avatar-initials")).not.toBeInTheDocument();
  });

  test("Image 실패는 Placeholder로 조용히 대체한다", () => {
    render(<Avatar imageSource="https://example.com/broken.png" />);
    dispatchImageEvent("error");

    expect(screen.getByTestId("ui-lynx-avatar")).toHaveAttribute("data-content", "placeholder");
    expect(screen.getByTestId("ui-lynx-avatar-image")).toHaveClass("ui-lynx-avatar-image-error");
    const placeholder = screen.getByTestId("ui-lynx-avatar-placeholder");
    expect(placeholder).toHaveAttribute(
      "content",
      user.replace(/currentColor/g, color.fg["neutral-subtle"]),
    );
  });

  test("hidden 접근성은 root와 모든 Content를 접근성 트리에서 숨긴다", () => {
    render(<Avatar name="김말랑" accessibility="hidden" />);
    const avatar = screen.getByTestId("ui-lynx-avatar");

    expect(avatar).toHaveAttribute("accessibility-element", "false");
    expect(avatar).toHaveAttribute("accessibility-elements-hidden", "true");
    expect(avatar).not.toHaveAttribute("accessibility-label");
  });

  // 뿌리의 내용 수식 클래스가 자식 클래스(`ui-lynx-avatar-image` 등)와 같은 이름이면 그림이 읽힌 뒤 뿌리가 자식 규칙
  // (absolute · 100%)을 받아 흐름에서 빠집니다 — 줄 안에서 폭이 0이 되고 원이 칸 아래로 떨어집니다(13 mini 실기).
  test("뿌리 클래스는 어떤 내용 상태에서도 자식 요소의 클래스와 겹치지 않는다", () => {
    const childClasses = [
      "ui-lynx-avatar-image",
      "ui-lynx-avatar-initials",
      "ui-lynx-avatar-placeholder",
    ];
    const rootClassesOf = () => Array.from(screen.getByTestId("ui-lynx-avatar").classList);

    render(<Avatar imageSource="https://example.com/avatar.png" name="김말랑" size="sm" />);
    expect(rootClassesOf()).toContain("ui-lynx-avatar-content-initials");
    dispatchImageEvent("load");
    expect(rootClassesOf()).toContain("ui-lynx-avatar-content-image");
    expect(rootClassesOf().filter((name) => childClasses.includes(name))).toEqual([]);
    dispatchImageEvent("error");
    expect(rootClassesOf()).toContain("ui-lynx-avatar-content-initials");
    expect(rootClassesOf().filter((name) => childClasses.includes(name))).toEqual([]);
  });

  test("그림은 지름이 정해진 원 안에서 aspectFill로 꽉 차고 원 밖은 잘린다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/avatar/avatar.css"), "utf8");
    expect(styles).toMatch(
      /\.ui-lynx-avatar\s*\{[^}]*flex-shrink:\s*0[^}]*overflow:\s*hidden[^}]*border-radius:\s*var\(--libitum-radius-full\)/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-avatar-image\s*\{[^}]*position:\s*absolute[^}]*width:\s*100%[^}]*height:\s*100%/s,
    );
    render(<Avatar imageSource="https://example.com/avatar.png" name="김말랑" size="sm" />);
    dispatchImageEvent("load");
    const avatar = screen.getByTestId("ui-lynx-avatar");
    expect(avatar).toHaveClass("ui-lynx-avatar", "ui-lynx-avatar-sm");
    expect(screen.getByTestId("ui-lynx-avatar-image")).toHaveAttribute("mode", "aspectFill");
    expect(screen.getByTestId("ui-lynx-avatar-image")).toHaveClass("ui-lynx-avatar-image");
  });

  test("Size별 지름·타이포·icon과 원형 surface token을 고정한다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/avatar/avatar.css"), "utf8");
    for (const [size, spacing] of [
      ["xs", "24"],
      ["sm", "32"],
      ["md", "48"],
      ["lg", "64"],
      ["xl", "96"],
    ]) {
      expect(styles).toMatch(
        new RegExp(
          `\\.ui-lynx-avatar-${size}\\s*\\{[^}]*width:\\s*var\\(--libitum-spacing-${spacing}\\)[^}]*height:\\s*var\\(--libitum-spacing-${spacing}\\)`,
          "s",
        ),
      );
    }
    expect(styles).toMatch(/border-radius:\s*var\(--libitum-radius-full\)/);
    expect(styles).toMatch(/background-color:\s*var\(--libitum-color-gray-100\)/);
    expect(styles).toMatch(/color:\s*var\(--libitum-color-fg-brand\)/);
    expect(styles).toMatch(/\.ui-lynx-avatar-image\s*\{[^}]*width:\s*100%[^}]*height:\s*100%/s);
    expect(styles).toMatch(
      /\.ui-lynx-avatar-image-loading,[^{]*\.ui-lynx-avatar-image-error\s*\{[^}]*opacity:\s*0/s,
    );
  });
});
