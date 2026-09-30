import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { color } from "@libitums/design-tokens";
import arrowDown from "@libitums/icons/lynx/arrow-down";
import { describe, expect, test, vi } from "vitest";

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
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-measure")).toHaveTextContent("A🙂BC");
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-continue-indicator")).toHaveStyle({
      visibility: "hidden",
    });
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
    expect(icon).toHaveAttribute(
      "content",
      arrowDown.replace(/currentColor/g, color.brand.primary),
    );
    expect(icon).toHaveAttribute("current-color", color.brand.primary);
  });

  test("계속 표시는 기본으로 위아래로 움직이고, reducedMotion이면 멈춰 있다", () => {
    const { unmount } = render(<VisualNovelDialog line="어서 오세요!" speakerName="이유나" />);
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-continue-indicator")).toHaveAttribute(
      "data-motion",
      "bounce",
    );
    unmount();

    render(<VisualNovelDialog line="어서 오세요!" speakerName="이유나" reducedMotion={true} />);
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-continue-indicator")).toHaveAttribute(
      "data-motion",
      "static",
    );
  });

  test("대사가 드러나는 중(revealing)에는 계속 표시가 서지 않는다", () => {
    render(
      <VisualNovelDialog
        line="어서 오세요!"
        speakerName="이유나"
        reveal="typewriter"
        status="revealing"
        visibleCharacterCount={2}
      />,
    );
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-continue-indicator")).toHaveStyle({
      visibility: "hidden",
    });
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

  test("번역이 있으면 대사 아래 구분선 뒤에 서고, 접근성 이름이 대사 뒤에 이어 읽는다", () => {
    render(
      <VisualNovelDialog
        line="어서 오세요!"
        speakerName="이유나"
        translation="Welcome!"
        contentLanguage="learning"
        languageTag="ko"
      />,
    );

    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-translation")).toHaveTextContent(
      "Welcome!",
    );
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
      "accessibility-label",
      "이유나: 어서 오세요! Welcome!",
    );
  });

  test("번역은 대사가 다 드러나기 전(revealing)에는 서지 않는다", () => {
    render(
      <VisualNovelDialog
        line="어서 오세요!"
        speakerName="이유나"
        translation="Welcome!"
        reveal="typewriter"
        status="revealing"
        visibleCharacterCount={2}
      />,
    );

    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-translation-block")).toHaveStyle({
      visibility: "hidden",
    });
  });

  test("번역이 없으면 번역 자리를 그리지 않는다", () => {
    render(<VisualNovelDialog line="어서 오세요!" speakerName="이유나" />);

    expect(
      screen.queryByTestId("ui-lynx-visual-novel-dialog-translation-block"),
    ).not.toBeInTheDocument();
  });

  test("bindtap이 있으면 패널이 탭을 직접 받고(event-through 끔) 한 번 부른다", () => {
    const onTap = vi.fn<() => void>();
    render(<VisualNovelDialog line="어서 오세요!" speakerName="이유나" bindtap={onTap} />);

    const dialog = screen.getByTestId("ui-lynx-visual-novel-dialog");
    expect(dialog).toHaveAttribute("event-through", "false");
    // 핸들러가 `catchtap`에 붙으므로 catch 이벤트로 쏩니다.
    fireEvent.tap(dialog, { eventType: "catchEvent" });
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
