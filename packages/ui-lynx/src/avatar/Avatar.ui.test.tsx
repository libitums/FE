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
    expect(avatar).toHaveClass("ui-lynx-avatar-sm", "ui-lynx-avatar-initials");
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
