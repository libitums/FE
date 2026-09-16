import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { getVisualNovelDialogContract } from "./visual-novel-dialog.contract";

describe("getVisualNovelDialogContract", () => {
  test("Speech 기본값을 Opaque·Instant·Tap·Ready로 정규화한다", () => {
    expect(
      getVisualNovelDialogContract({
        line: "오늘 하늘이 참 예쁘다.",
        speakerName: "아리아",
      }),
    ).toEqual({
      accessibilityLabel: "아리아: 오늘 하늘이 참 예쁘다.",
      advance: "tap",
      avatar: "off",
      className:
        "ui-lynx-visual-novel-dialog ui-lynx-visual-novel-dialog-speech ui-lynx-visual-novel-dialog-opaque ui-lynx-visual-novel-dialog-ready ui-lynx-visual-novel-dialog-ltr",
      contentLanguage: "ui",
      continueIndicator: "on",
      direction: "ltr",
      line: "오늘 하늘이 참 예쁘다.",
      reveal: "instant",
      showContinueIndicator: true,
      speakerName: "아리아",
      status: "ready",
      surface: "opaque",
      variant: "speech",
      visibleLine: "오늘 하늘이 참 예쁘다.",
    });
  });

  test("Narration은 화자 없이 본문만 접근성 이름으로 사용한다", () => {
    expect(
      getVisualNovelDialogContract({
        variant: "narration",
        line: "비가 조용히 내리기 시작했다.",
        surface: "translucent",
      }),
    ).toMatchObject({
      accessibilityLabel: "비가 조용히 내리기 시작했다.",
      avatar: "off",
      surface: "translucent",
      variant: "narration",
    });
  });

  test("Thought는 종류를 포함한 접근성 이름을 만든다", () => {
    expect(
      getVisualNovelDialogContract({
        variant: "thought",
        line: "이번에는 꼭 말해야 해.",
        speakerName: "아리아",
      }).accessibilityLabel,
    ).toBe("아리아, 속마음: 이번에는 꼭 말해야 해.");
  });

  test("Typewriter Revealing은 Unicode code point 단위로 시각 문자열만 줄인다", () => {
    expect(
      getVisualNovelDialogContract({
        line: "A🙂BC",
        speakerName: "Mina",
        reveal: "typewriter",
        status: "revealing",
        visibleCharacterCount: 2,
      }),
    ).toMatchObject({
      accessibilityLabel: "Mina: A🙂BC",
      reveal: "typewriter",
      showContinueIndicator: false,
      status: "revealing",
      visibleLine: "A🙂",
    });
  });

  test("Ready에서는 전체 Line과 Continue indicator를 보여준다", () => {
    expect(
      getVisualNovelDialogContract({
        line: "다음 문장이 남아 있어요.",
        speakerName: "아리아",
        reveal: "typewriter",
        status: "ready",
      }),
    ).toMatchObject({
      showContinueIndicator: true,
      status: "ready",
      visibleLine: "다음 문장이 남아 있어요.",
    });
  });

  test("Continue indicator off를 Ready에서도 유지한다", () => {
    expect(
      getVisualNovelDialogContract({
        line: "마지막 문장입니다.",
        speakerName: "아리아",
        continueIndicator: "off",
      }).showContinueIndicator,
    ).toBe(false);
  });

  test("동작 줄이기는 Typewriter를 Instant·Ready로 바꾼다", () => {
    expect(
      getVisualNovelDialogContract({
        line: "문장 전체를 바로 보여 줍니다.",
        speakerName: "아리아",
        reveal: "typewriter",
        status: "revealing",
        visibleCharacterCount: 3,
        reducedMotion: true,
      }),
    ).toMatchObject({
      reveal: "instant",
      status: "ready",
      visibleLine: "문장 전체를 바로 보여 줍니다.",
    });
  });

  test("Learning language metadata와 Auto pause control을 보존한다", () => {
    expect(
      getVisualNovelDialogContract({
        line: "See you tomorrow.",
        speakerName: "Mina",
        advance: "auto",
        autoControlAvailable: true,
        contentLanguage: "learning",
        languageTag: "en-US",
      }),
    ).toMatchObject({ advance: "auto", contentLanguage: "learning", languageTag: "en-US" });
  });

  test.each([
    [{ line: "", speakerName: "아리아" }, "VisualNovelDialog line must not be empty"],
    [
      { line: "대사", speakerName: "", variant: "speech" },
      "VisualNovelDialog speakerName must not be empty",
    ],
    [
      { line: "Narration", variant: "narration", speakerName: "화자" },
      "VisualNovelDialog narration must not have a speakerName",
    ],
    [
      { line: "Narration", variant: "narration", avatar: "avatar" },
      "VisualNovelDialog narration must not have an avatar",
    ],
    [
      { line: "Learning", speakerName: "Mina", contentLanguage: "learning" },
      "VisualNovelDialog languageTag is required for learning content",
    ],
    [
      { line: "Auto", speakerName: "Mina", advance: "auto" },
      "VisualNovelDialog auto advance requires an available pause control",
    ],
    [
      { line: "짧음", speakerName: "아리아", visibleCharacterCount: 4 },
      "VisualNovelDialog visibleCharacterCount must be within the line length",
    ],
    [
      { line: "즉시", speakerName: "아리아", reveal: "instant", status: "revealing" },
      "VisualNovelDialog instant reveal cannot be revealing",
    ],
  ])("잘못된 조합 %#을 거부한다", (props, message) => {
    expect(() =>
      getVisualNovelDialogContract(
        props as unknown as Parameters<typeof getVisualNovelDialogContract>[0],
      ),
    ).toThrow(message);
  });
});

describe("visual-novel-dialog.css", () => {
  const styles = readFileSync(
    resolve(process.cwd(), "src/visual-novel-dialog/visual-novel-dialog.css"),
    "utf8",
  );

  test("공통 panel token과 최소 2줄 높이를 사용한다", () => {
    expect(styles).toContain("padding: var(--libitum-spacing-20) var(--libitum-spacing-24)");
    expect(styles).toContain("border-radius: var(--libitum-radius-lg)");
    expect(styles).toContain("box-shadow: var(--libitum-elevation-shadow-s3)");
    expect(styles).toContain("z-index: var(--libitum-elevation-z-floating)");
    expect(styles).toContain("min-height: var(--libitum-spacing-48)");
  });

  test("대사 typography와 variant 전경 token을 사용한다", () => {
    expect(styles).toContain("var(--libitum-typography-dialogue-speaker-font-size)");
    expect(styles).toContain("var(--libitum-typography-dialogue-body-font-size)");
    expect(styles).toContain("var(--libitum-color-gray-300)");
    expect(styles).toContain("var(--libitum-color-gray-600)");
    expect(styles).toContain("var(--libitum-color-brand-reward-disabled-surface)");
  });

  test("Thought의 Opaque와 Translucent 강조색을 구분한다", () => {
    expect(styles).toMatch(/\.ui-lynx-visual-novel-dialog-thought\s*\{[^}]*brand-primary/s);
    expect(styles).toMatch(
      /\.ui-lynx-visual-novel-dialog-thought\.ui-lynx-visual-novel-dialog-translucent\s*\{[^}]*brand-secondary/s,
    );
  });

  test("Translucent surface는 opacity.surface token과 0.9 호환 fallback을 사용한다", () => {
    expect(styles).toContain("opacity: var(--libitum-opacity-surface, 0.9)");
  });

  test("색 전환만 허용하고 위치·크기 animation을 만들지 않는다", () => {
    expect(styles).toContain("transition-duration: var(--libitum-motion-duration-color)");
    expect(styles).toContain("transition-timing-function: var(--libitum-motion-easing-easing)");
    expect(styles).not.toMatch(/transition-property:[^;]*(transform|width|height)/);
    expect(styles).not.toContain("animation:");
  });
});
