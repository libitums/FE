import { render, screen } from "@lynx-js/react/testing-library";
import { color } from "@libitums/design-tokens";
import arrowDown from "@libitums/icons/lynx/arrow-down";
import { describe, expect, test } from "vitest";

import { VisualNovelDialog } from "./index";

describe("VisualNovelDialog UI", () => {
  test("Speech 화자와 전체 대사를 하나의 접근성 node로 제공한다", () => {
    render(<VisualNovelDialog line="오늘 하늘이 참 예쁘다." speakerName="아리아" />);

    const dialog = screen.getByTestId("ui-lynx-visual-novel-dialog");
    expect(dialog).toHaveAttribute("accessibility-element", "true");
    expect(dialog).toHaveAttribute("accessibility-label", "아리아: 오늘 하늘이 참 예쁘다.");
    expect(dialog).toHaveAttribute("accessibility-traits", "text");
    expect(dialog).toHaveAttribute("event-through", "true");
    expect(dialog).toHaveAttribute("focusable", "false");
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-speaker")).toHaveTextContent("아리아");
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent(
      "오늘 하늘이 참 예쁘다.",
    );
  });

  test("Narration은 Speaker row와 Avatar를 렌더하지 않는다", () => {
    render(<VisualNovelDialog variant="narration" line="비가 조용히 내리기 시작했다." />);

    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-speaker-row")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-avatar")).not.toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
      "accessibility-label",
      "비가 조용히 내리기 시작했다.",
    );
  });

  test("Avatar slot은 화자 행에 장식으로 조합된다", () => {
    render(
      <VisualNovelDialog
        line="어서 와. 기다리고 있었어."
        speakerName="아리아"
        avatar={
          <view data-testid="avatar-slot">
            <text>A</text>
          </view>
        }
      />,
    );

    expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute("data-avatar", "on");
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-avatar")).toContainElement(
      screen.getByTestId("avatar-slot"),
    );
  });

  test("Revealing은 일부 글자만 보이지만 접근성 이름은 전체 문장을 유지한다", () => {
    render(
      <VisualNovelDialog
        line="A🙂BC"
        speakerName="Mina"
        reveal="typewriter"
        status="revealing"
        visibleCharacterCount={2}
      />,
    );

    const dialog = screen.getByTestId("ui-lynx-visual-novel-dialog");
    expect(dialog).toHaveAttribute("data-status", "revealing");
    expect(dialog).toHaveAttribute("accessibility-label", "Mina: A🙂BC");
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent("A🙂");
    expect(
      screen.queryByTestId("ui-lynx-visual-novel-dialog-continue-indicator"),
    ).not.toBeInTheDocument();
  });

  test("Ready에서만 장식 Continue indicator를 렌더한다", () => {
    render(
      <VisualNovelDialog
        line="다음 대사가 남아 있어요."
        speakerName="아리아"
        reveal="typewriter"
        status="ready"
      />,
    );

    expect(
      screen.getByTestId("ui-lynx-visual-novel-dialog-continue-indicator"),
    ).toBeInTheDocument();
    const icon = screen
      .getByTestId("ui-lynx-visual-novel-dialog-continue-indicator")
      .querySelector("svg");
    expect(icon).toHaveAttribute("content", arrowDown.replace(/currentColor/g, color.gray["300"]));
    expect(icon).toHaveAttribute("current-color", color.gray["300"]);
  });

  test("Thought·Translucent·RTL·학습 언어 metadata를 노출한다", () => {
    render(
      <VisualNovelDialog
        variant="thought"
        surface="translucent"
        direction="rtl"
        contentLanguage="learning"
        languageTag="ar-SA"
        line="يجب أن أقولها الآن."
        speakerName="آريا"
      />,
    );

    const dialog = screen.getByTestId("ui-lynx-visual-novel-dialog");
    expect(dialog).toHaveAttribute("data-variant", "thought");
    expect(dialog).toHaveAttribute("data-surface", "translucent");
    expect(dialog).toHaveAttribute("data-language", "learning");
    expect(dialog).toHaveAttribute("data-lang", "ar-SA");
    expect(dialog).toHaveClass("ui-lynx-visual-novel-dialog-rtl");
  });
});
