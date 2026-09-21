import type {
  VisualNovelDialogAdvance,
  VisualNovelDialogContentLanguage,
  VisualNovelDialogContinueIndicator,
  VisualNovelDialogDirection,
  VisualNovelDialogReveal,
  VisualNovelDialogStatus,
  VisualNovelDialogSurface,
  VisualNovelDialogVariant,
} from "@libitums/ui-lynx/visual-novel-dialog";

export type VisualNovelDialogStoryData = {
  readonly accessibilityLabel?: string;
  readonly advance: VisualNovelDialogAdvance;
  readonly contentLanguage: VisualNovelDialogContentLanguage;
  readonly continueIndicator: VisualNovelDialogContinueIndicator;
  readonly direction: VisualNovelDialogDirection;
  readonly languageTag?: string;
  readonly line: string;
  readonly reducedMotion: boolean;
  readonly reveal: VisualNovelDialogReveal;
  readonly showAvatar: boolean;
  readonly speakerName: string;
  readonly status: VisualNovelDialogStatus;
  readonly surface: VisualNovelDialogSurface;
  readonly variant: VisualNovelDialogVariant;
  readonly visibleCharacterCount: number;
};

const allowed = <T extends string>(values: readonly T[], value: unknown, fallback: T): T =>
  values.includes(value as T) ? (value as T) : fallback;

export function normalizeVisualNovelDialogStoryArgs(input: unknown): VisualNovelDialogStoryData {
  const args = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const line =
    typeof args.line === "string" && args.line.trim()
      ? args.line
      : "달빛이 비치는 숲길에서 드디어 다시 만났네.";
  const contentLanguage = allowed(["ui", "learning"] as const, args.contentLanguage, "ui");
  const languageTag =
    typeof args.languageTag === "string" && args.languageTag.trim()
      ? args.languageTag.trim()
      : contentLanguage === "learning"
        ? "en"
        : undefined;
  const visibleCharacterCount = Number.isInteger(args.visibleCharacterCount)
    ? Math.max(0, Math.min(args.visibleCharacterCount as number, Array.from(line).length))
    : 0;
  const accessibilityLabel =
    typeof args.accessibilityLabel === "string" && args.accessibilityLabel.trim()
      ? args.accessibilityLabel.trim()
      : undefined;

  return {
    ...(accessibilityLabel ? { accessibilityLabel } : {}),
    advance: allowed(["tap", "auto"] as const, args.advance, "tap"),
    contentLanguage,
    continueIndicator: allowed(["on", "off"] as const, args.continueIndicator, "on"),
    direction: allowed(["ltr", "rtl"] as const, args.direction, "ltr"),
    ...(languageTag ? { languageTag } : {}),
    line,
    reducedMotion: args.reducedMotion === true,
    reveal: allowed(["instant", "typewriter"] as const, args.reveal, "instant"),
    showAvatar: args.showAvatar === true,
    speakerName:
      typeof args.speakerName === "string" && args.speakerName.trim() ? args.speakerName : "아리아",
    status: allowed(["revealing", "ready"] as const, args.status, "ready"),
    surface: allowed(["opaque", "translucent"] as const, args.surface, "opaque"),
    variant: allowed(["speech", "narration", "thought"] as const, args.variant, "speech"),
    visibleCharacterCount,
  };
}
