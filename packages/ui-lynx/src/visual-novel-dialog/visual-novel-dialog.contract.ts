import type { ReactNode } from "@lynx-js/react";
import { resolveReducedMotion, type Motion } from "../motion/motion.contract";

export type VisualNovelDialogVariant = "speech" | "narration" | "thought";
export type VisualNovelDialogSurface = "opaque" | "translucent";
export type VisualNovelDialogReveal = "instant" | "typewriter";
export type VisualNovelDialogAdvance = "tap" | "auto";
export type VisualNovelDialogStatus = "revealing" | "ready";
export type VisualNovelDialogContinueIndicator = "on" | "off";
export type VisualNovelDialogContentLanguage = "ui" | "learning";
export type VisualNovelDialogDirection = "ltr" | "rtl";

/**
 * 이름 줄 오른쪽(화자가 없으면 같은 자리)에 서는 스위치 하나입니다(FE 확장, 2026-11-24 앱 ADR-0188 개정 D7). 대사 상자 안에서
 * 보조 표시(로마자 줄 등)를 켜고 끄는 자리이고, 값의 주인은 부르는 쪽입니다 — 누르면 `onChange(!checked)`만 부릅니다.
 */
export type VisualNovelDialogHeaderSwitch = {
  /** 스위치 앞에 보이는 글자이자 낭독 이름입니다. */
  readonly label: string;
  readonly checked: boolean;
  /** 낭독에 붙는 상태 말(「On」 · 「Off」 등, 부르는 쪽 언어)입니다. */
  readonly stateLabel: string;
  readonly onChange: (checked: boolean) => void;
};

export type VisualNovelDialogHeaderSwitchContract = {
  readonly label: string;
  readonly checked: boolean;
  readonly accessibilityLabel: string;
};

type VisualNovelDialogBaseProps = {
  readonly line: string;
  /**
   * 대사 아래 구분선 뒤에 서는 번역입니다(FE 확장, 2026-09-28 디자인 반영). 학습 대사를
   * 모국어로 옮긴 한 줄이고, 대사가 다 드러난 뒤(`ready`)에만 섭니다.
   */
  readonly translation?: string;
  /**
   * 대사의 읽는 법(로마자)입니다(FE 확장, 2026-11-24 ADR-0188). 대사 바로 아래 · 구분선 위에 서고(개정 D7 — 읽는 법은
   * 한국어에 붙고 구분선 아래는 뜻만), 번역처럼 대사가 다 드러난 뒤에만 보입니다. 빈 문자열은 없음입니다.
   */
  readonly romanization?: string;
  readonly headerSwitch?: VisualNovelDialogHeaderSwitch;
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
  /** 화자 줄과 대사 줄 사이에 서는 지문입니다(speech · thought 전용). */
  readonly aside?: string;
  /** 지문 아래 같은 작은 기울임으로 서는 둘째 줄입니다(지문의 번역). `aside`가 있어야 합니다. */
  readonly asideTranslation?: string;
};

export type VisualNovelDialogNarrationProps = VisualNovelDialogBaseProps & {
  readonly variant: "narration";
  readonly speakerName?: never;
  readonly avatar?: never;
  readonly aside?: never;
  readonly asideTranslation?: never;
};

export type VisualNovelDialogThoughtProps = VisualNovelDialogBaseProps & {
  readonly variant: "thought";
  readonly speakerName: string;
  readonly avatar?: ReactNode;
  readonly aside?: string;
  readonly asideTranslation?: string;
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
  readonly aside?: string;
  readonly asideTranslation?: string;
  readonly status: VisualNovelDialogStatus;
  readonly translation?: string;
  readonly romanization?: string;
  readonly headerSwitch?: VisualNovelDialogHeaderSwitchContract;
  /** 로마자 줄이 보이는가 — 로마자가 있고 대사가 다 드러났을 때입니다. */
  readonly showRomanization: boolean;
  /** 번역 묶음(구분선 · 번역)이 보이는가 — 번역이 있고 대사가 다 드러났을 때입니다. */
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

function getHeaderSwitchContract(
  value: VisualNovelDialogHeaderSwitch | undefined,
): VisualNovelDialogHeaderSwitchContract | undefined {
  if (value === undefined) return undefined;
  const label = requireVisibleText(value.label, "headerSwitch label").trim();
  const stateLabel = requireVisibleText(value.stateLabel, "headerSwitch stateLabel").trim();
  return { label, checked: value.checked, accessibilityLabel: `${label}, ${stateLabel}` };
}

export function getVisualNovelDialogContract(
  props: VisualNovelDialogProps,
  contextMotion: Motion = "standard",
): VisualNovelDialogContract {
  const line = requireVisibleText(props.line, "line");
  const variant = props.variant ?? "speech";
  const surface = props.surface ?? "opaque";
  const requestedReveal = props.reveal ?? "instant";
  const reduced = resolveReducedMotion(props.reducedMotion, contextMotion);
  const reveal = reduced ? "instant" : requestedReveal;
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

  if (
    variant === "narration" &&
    (props.aside !== undefined || props.asideTranslation !== undefined)
  ) {
    throw new Error("VisualNovelDialog narration must not have an aside");
  }
  const aside = props.aside === undefined ? undefined : requireVisibleText(props.aside, "aside");
  const asideTranslation =
    props.asideTranslation === undefined
      ? undefined
      : requireVisibleText(props.asideTranslation, "asideTranslation");
  if (asideTranslation !== undefined && aside === undefined) {
    throw new Error("VisualNovelDialog asideTranslation requires an aside");
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
  // 빈 로마자는 없음입니다(번역과 달리 던지지 않습니다 — 부르는 쪽이 「없으면 빈 문자열」로 넘깁니다).
  const romanization = props.romanization?.trim() || undefined;
  const headerSwitch = getHeaderSwitchContract(props.headerSwitch);
  // 지문이 있으면 화자 뒤, 대사 앞에서 읽습니다(화면에 선 순서).
  const asideLead = aside === undefined ? "" : `, ${aside}`;
  const defaultAccessibilityLabel =
    variant === "narration"
      ? line
      : variant === "thought"
        ? `${speakerName}, thinking${asideLead}: ${line}`
        : `${speakerName}${asideLead}: ${line}`;
  // 번역이 있으면 대사 뒤에 이어 읽습니다 — 화면에 선 두 줄을 한 요소가 함께 냅니다.
  // 로마자가 있으면 대사 뒤 · 번역 앞에 읽습니다(화면에 선 순서).
  const spokenLine =
    romanization === undefined
      ? defaultAccessibilityLabel
      : `${defaultAccessibilityLabel}, ${romanization}`;
  const accessibilityLabel =
    props.accessibilityLabel === undefined
      ? translation
        ? `${spokenLine} ${translation}`
        : spokenLine
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
      // 스위치 · 로마자 줄이 있을 때만 붙습니다(이 확장 전 클래스는 그대로).
      headerSwitch ? "ui-lynx-visual-novel-dialog-with-switch" : undefined,
      romanization ? "ui-lynx-visual-novel-dialog-with-romanization" : undefined,
    ]
      .filter((token): token is string => token !== undefined)
      .join(" "),
    contentLanguage,
    continueIndicator,
    direction,
    ...(languageTag ? { languageTag } : {}),
    line,
    reveal,
    showContinueIndicator: continueIndicator === "on" && status === "ready",
    ...(speakerName ? { speakerName } : {}),
    ...(aside ? { aside } : {}),
    ...(asideTranslation ? { asideTranslation } : {}),
    status,
    surface,
    ...(translation ? { translation } : {}),
    ...(romanization ? { romanization } : {}),
    ...(headerSwitch ? { headerSwitch } : {}),
    // 로마자 줄과 번역 묶음(구분선 · 번역)은 따로 서고, 둘 다 대사가 다 드러난 뒤에만 보입니다(ADR-0188 개정 D7).
    showRomanization: romanization !== undefined && status === "ready",
    showTranslation: translation !== undefined && status === "ready",
    variant,
    visibleLine,
  };
}
