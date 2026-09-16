import type { ReactNode } from "@lynx-js/react";

export type VisualNovelDialogVariant = "speech" | "narration" | "thought";
export type VisualNovelDialogSurface = "opaque" | "translucent";
export type VisualNovelDialogReveal = "instant" | "typewriter";
export type VisualNovelDialogAdvance = "tap" | "auto";
export type VisualNovelDialogStatus = "revealing" | "ready";
export type VisualNovelDialogContinueIndicator = "on" | "off";
export type VisualNovelDialogContentLanguage = "ui" | "learning";
export type VisualNovelDialogDirection = "ltr" | "rtl";

type VisualNovelDialogBaseProps = {
  readonly line: string;
  readonly surface?: VisualNovelDialogSurface;
  readonly reveal?: VisualNovelDialogReveal;
  readonly status?: VisualNovelDialogStatus;
  readonly visibleCharacterCount?: number;
  readonly continueIndicator?: VisualNovelDialogContinueIndicator;
  readonly contentLanguage?: VisualNovelDialogContentLanguage;
  readonly languageTag?: string;
  readonly direction?: VisualNovelDialogDirection;
  readonly reducedMotion?: boolean;
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
  readonly languageTag?: string;
  readonly line: string;
  readonly reveal: VisualNovelDialogReveal;
  readonly showContinueIndicator: boolean;
  readonly speakerName?: string;
  readonly status: VisualNovelDialogStatus;
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
  const visibleCharacterCount = props.visibleCharacterCount ?? 0;
  if (
    !Number.isInteger(visibleCharacterCount) ||
    visibleCharacterCount < 0 ||
    visibleCharacterCount > characterCount
  ) {
    throw new Error("VisualNovelDialog visibleCharacterCount must be within the line length");
  }
  if (requestedReveal === "instant" && props.status === "revealing") {
    throw new Error("VisualNovelDialog instant reveal cannot be revealing");
  }

  const visibleLine =
    reveal === "typewriter" && status === "revealing"
      ? getVisibleLine(line, visibleCharacterCount)
      : line;
  const avatar = variant !== "narration" && props.avatar !== undefined ? "on" : "off";
  const accessibilityLabel =
    variant === "narration"
      ? line
      : variant === "thought"
        ? `${speakerName}, 속마음: ${line}`
        : `${speakerName}: ${line}`;

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
    ...(languageTag ? { languageTag } : {}),
    line,
    reveal,
    showContinueIndicator: continueIndicator === "on" && status === "ready",
    ...(speakerName ? { speakerName } : {}),
    status,
    surface,
    variant,
    visibleLine,
  };
}
