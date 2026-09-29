import type { ReactNode } from "@lynx-js/react";

export type VisualNovelDialogVariant = "speech" | "narration" | "thought";
export type VisualNovelDialogSurface = "opaque" | "translucent";
export type VisualNovelDialogReveal = "instant" | "typewriter";
export type VisualNovelDialogAdvance = "tap" | "auto";
export type VisualNovelDialogStatus = "revealing" | "ready";
export type VisualNovelDialogContinueIndicator = "on" | "off";
export type VisualNovelDialogContentLanguage = "ui" | "learning";
export type VisualNovelDialogDirection = "ltr" | "rtl";
/**
 * 계속 표시의 움직임입니다. `bounce`는 위아래로 되풀이해 움직여 「눌러서 넘기라」를 알립니다.
 * `reducedMotion`이면 `static`입니다.
 */
export type VisualNovelDialogIndicatorMotion = "bounce" | "static";

type VisualNovelDialogBaseProps = {
  readonly line: string;
  /**
   * 대사 아래 구분선 뒤에 서는 번역입니다(FE 확장, 2026-09-28 디자인 반영). 학습 대사를
   * 모국어로 옮긴 한 줄이고, 대사가 다 드러난 뒤(`ready`)에만 섭니다.
   */
  readonly translation?: string;
  readonly accessibilityLabel?: string;
  readonly surface?: VisualNovelDialogSurface;
  readonly reveal?: VisualNovelDialogReveal;
  readonly status?: VisualNovelDialogStatus;
  readonly visibleCharacterCount?: number;
  readonly continueIndicator?: VisualNovelDialogContinueIndicator;
  readonly contentLanguage?: VisualNovelDialogContentLanguage;
  readonly languageTag?: string;
  readonly direction?: VisualNovelDialogDirection;
  readonly reducedMotion?: boolean;
  /**
   * 패널을 눌렀을 때 부릅니다(FE 확장, 2026-09-28). 없으면 패널은 `event-through`라 탭을
   * 받지 않습니다. 있으면 패널이 탭을 직접 받고 **전파를 끊습니다** — 패널을 감싼 화면이 같은
   * 탭으로 한 번 더 넘기지 않게 하기 위해서입니다.
   */
  readonly bindtap?: () => void;
};

export type VisualNovelDialogSpeechProps = VisualNovelDialogBaseProps & {
  readonly variant?: "speech";
  readonly speakerName: string;
  readonly avatar?: ReactNode;
};

export type VisualNovelDialogNarrationProps = VisualNovelDialogBaseProps & {
  readonly variant: "narration";
  readonly speakerName?: never;
  readonly avatar?: never;
};

export type VisualNovelDialogThoughtProps = VisualNovelDialogBaseProps & {
  readonly variant: "thought";
  readonly speakerName: string;
  readonly avatar?: ReactNode;
};

type VisualNovelDialogTapAdvanceProps = {
  readonly advance?: "tap";
  readonly autoControlAvailable?: never;
};

type VisualNovelDialogAutoAdvanceProps = {
  readonly advance: "auto";
  readonly autoControlAvailable: true;
};

export type VisualNovelDialogProps = (
  | VisualNovelDialogSpeechProps
  | VisualNovelDialogNarrationProps
  | VisualNovelDialogThoughtProps
) &
  (VisualNovelDialogTapAdvanceProps | VisualNovelDialogAutoAdvanceProps);

export type VisualNovelDialogContract = {
  readonly accessibilityLabel: string;
  readonly advance: VisualNovelDialogAdvance;
  readonly avatar: "on" | "off";
  readonly className: string;
  readonly contentLanguage: VisualNovelDialogContentLanguage;
  readonly continueIndicator: VisualNovelDialogContinueIndicator;
  readonly direction: VisualNovelDialogDirection;
  readonly indicatorMotion: VisualNovelDialogIndicatorMotion;
  readonly languageTag?: string;
  readonly line: string;
  readonly reveal: VisualNovelDialogReveal;
  readonly showContinueIndicator: boolean;
  readonly speakerName?: string;
  readonly status: VisualNovelDialogStatus;
  readonly translation?: string;
  readonly showTranslation: boolean;
  readonly surface: VisualNovelDialogSurface;
  readonly variant: VisualNovelDialogVariant;
  readonly visibleLine: string;
};

function requireVisibleText(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`VisualNovelDialog ${field} must not be empty`);
  }
  return value;
}

function normalizeLanguageTag(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function getVisibleLine(line: string, count: number): string {
  return Array.from(line).slice(0, count).join("");
}

export function getVisualNovelDialogContract(
  props: VisualNovelDialogProps,
): VisualNovelDialogContract {
  const line = requireVisibleText(props.line, "line");
  const variant = props.variant ?? "speech";
  const surface = props.surface ?? "opaque";
  const requestedReveal = props.reveal ?? "instant";
  const reveal = props.reducedMotion ? "instant" : requestedReveal;
  const requestedStatus =
    props.status ?? (requestedReveal === "typewriter" ? "revealing" : "ready");
  const status = reveal === "instant" ? "ready" : requestedStatus;
  const continueIndicator = props.continueIndicator ?? "on";
  const advance = props.advance ?? "tap";
  const contentLanguage = props.contentLanguage ?? "ui";
  const direction = props.direction ?? "ltr";
  const languageTag = normalizeLanguageTag(props.languageTag);

  if (contentLanguage === "learning" && !languageTag) {
    throw new Error("VisualNovelDialog languageTag is required for learning content");
  }
  if (advance === "auto" && props.autoControlAvailable !== true) {
    throw new Error("VisualNovelDialog auto advance requires an available pause control");
  }

  let speakerName: string | undefined;
  if (variant === "speech" || variant === "thought") {
    speakerName = requireVisibleText(props.speakerName as string, "speakerName");
  } else if ("speakerName" in props && props.speakerName !== undefined) {
    throw new Error("VisualNovelDialog narration must not have a speakerName");
  }
  if (variant === "narration" && "avatar" in props && props.avatar !== undefined) {
    throw new Error("VisualNovelDialog narration must not have an avatar");
  }

  const characterCount = Array.from(line).length;
  const visibleCharacterCount = Number.isInteger(props.visibleCharacterCount)
    ? Math.max(0, Math.min(props.visibleCharacterCount as number, characterCount))
    : 0;
  if (requestedReveal === "instant" && props.status === "revealing") {
    throw new Error("VisualNovelDialog instant reveal cannot be revealing");
  }

  const visibleLine =
    reveal === "typewriter" && status === "revealing"
      ? getVisibleLine(line, visibleCharacterCount)
      : line;
  const avatar = variant !== "narration" && props.avatar !== undefined ? "on" : "off";
  const translation =
    props.translation === undefined
      ? undefined
      : requireVisibleText(props.translation, "translation");
  const defaultAccessibilityLabel =
    variant === "narration"
      ? line
      : variant === "thought"
        ? `${speakerName}, thinking: ${line}`
        : `${speakerName}: ${line}`;
  // 번역이 있으면 대사 뒤에 이어 읽습니다 — 화면에 선 두 줄을 한 요소가 함께 냅니다.
  const accessibilityLabel =
    props.accessibilityLabel === undefined
      ? translation
        ? `${defaultAccessibilityLabel} ${translation}`
        : defaultAccessibilityLabel
      : requireVisibleText(props.accessibilityLabel, "accessibilityLabel");

  return {
    accessibilityLabel,
    advance,
    avatar,
    className: [
      "ui-lynx-visual-novel-dialog",
      `ui-lynx-visual-novel-dialog-${variant}`,
      `ui-lynx-visual-novel-dialog-${surface}`,
      `ui-lynx-visual-novel-dialog-${status}`,
      `ui-lynx-visual-novel-dialog-${direction}`,
    ].join(" "),
    contentLanguage,
    continueIndicator,
    direction,
    indicatorMotion: props.reducedMotion ? "static" : "bounce",
    ...(languageTag ? { languageTag } : {}),
    line,
    reveal,
    showContinueIndicator: continueIndicator === "on" && status === "ready",
    ...(speakerName ? { speakerName } : {}),
    status,
    surface,
    ...(translation ? { translation } : {}),
    showTranslation: translation !== undefined && status === "ready",
    variant,
    visibleLine,
  };
}
