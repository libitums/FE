import type { ReactNode } from "@lynx-js/react";

export type CardPadding = "m" | "l";

/**
 * 카드가 까는 면입니다. `default`는 흰 면이고, `secondary`는 화면 바탕보다 한 겹
 * 눌러앉은 따뜻한 회색입니다 — 학습 세션 헤더처럼 「이 안은 다른 문맥」을 면으로
 * 말해야 하는 자리에 씁니다.
 */
export type CardSurface = "default" | "secondary";

/**
 * 카드가 떠 있는 정도입니다. `raised`가 기본이고 목록 · 본문 카드가 씁니다.
 * `flat`은 그림자가 없습니다 — 이미 다른 면 위에 앉아 있어 띄울 이유가 없는 자리.
 * `stage`는 넓고 부드러운 그림자에 큰 모서리로, 학습 내용이 전개되는 무대처럼
 * 화면에서 혼자 앞에 서는 자리에 씁니다.
 */
export type CardElevation = "raised" | "flat" | "stage";
export type CardDirection = "ltr" | "rtl";
export type CardAccessibilityRole = "link" | "button";

type CardBaseProps = {
  readonly children: ReactNode;
  readonly padding?: CardPadding;
  readonly direction?: CardDirection;
  readonly surface?: CardSurface;
  readonly elevation?: CardElevation;
};

export type StaticCardProps = CardBaseProps & {
  readonly interaction?: "static";
  readonly accessibilityLabel?: never;
  readonly accessibilityDescription?: never;
  readonly accessibilityRole?: never;
  readonly bindtap?: never;
};

export type InteractiveCardProps = CardBaseProps & {
  readonly interaction: "interactive";
  readonly accessibilityLabel: string;
  readonly accessibilityDescription?: string;
  readonly accessibilityRole: CardAccessibilityRole;
  readonly bindtap: () => void;
};

export type CardProps = StaticCardProps | InteractiveCardProps;

export type CardMediaProps = {
  readonly children: ReactNode;
  readonly accessibilityLabel?: string;
};

export type CardContentProps = {
  readonly children: ReactNode;
};

export type CardHeaderProps = {
  readonly title: string;
  readonly overline?: string;
  readonly trailing?: ReactNode;
};

export type CardBodyProps = {
  readonly children: ReactNode;
};

export type CardBodyTextProps = {
  readonly children: string;
  readonly languageTag?: string;
};

export type CardFooterProps = {
  readonly primaryAction: ReactNode;
  readonly secondaryAction?: ReactNode;
};

export type CardContract = {
  readonly interaction: "static" | "interactive";
  readonly padding: CardPadding;
  readonly direction: CardDirection;
  readonly surface: CardSurface;
  readonly elevation: CardElevation;
  readonly className: string;
  readonly focusable: boolean;
  readonly accessibilityElement: boolean;
  readonly accessibilityLabel?: string;
  readonly accessibilityDescription?: string;
  readonly accessibilityRole?: CardAccessibilityRole;
};

function requireVisibleText(value: string, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Card ${name} must not be empty`);
  }
  return value;
}

export function getCardContract(props: CardProps): CardContract {
  const interaction = props.interaction ?? "static";
  const padding = props.padding ?? "m";
  const direction = props.direction ?? "ltr";
  const surface = props.surface ?? "default";
  const elevation = props.elevation ?? "raised";
  const className = [
    "ui-lynx-card",
    `ui-lynx-card-${padding}`,
    `ui-lynx-card-${direction}`,
    `ui-lynx-card-surface-${surface}`,
    `ui-lynx-card-elevation-${elevation}`,
    interaction === "interactive" ? "ui-lynx-card-interactive" : "ui-lynx-card-static",
  ].join(" ");

  if (props.interaction !== "interactive") {
    return {
      interaction,
      padding,
      direction,
      surface,
      elevation,
      className,
      focusable: false,
      accessibilityElement: false,
    };
  }

  const accessibilityLabel = requireVisibleText(props.accessibilityLabel, "accessibilityLabel");
  const accessibilityDescription =
    typeof props.accessibilityDescription === "string"
      ? props.accessibilityDescription.trim()
      : undefined;
  if (props.accessibilityRole !== "link" && props.accessibilityRole !== "button") {
    throw new Error("Card accessibilityRole must be link or button");
  }
  if (typeof props.bindtap !== "function") {
    throw new Error("Interactive Card bindtap must be a function");
  }

  return {
    interaction,
    padding,
    direction,
    surface,
    elevation,
    className,
    focusable: true,
    accessibilityElement: true,
    accessibilityLabel,
    ...(accessibilityDescription ? { accessibilityDescription } : {}),
    accessibilityRole: props.accessibilityRole,
  };
}

export function validateCardHeader(title: string, overline?: string): void {
  requireVisibleText(title, "title");
  if (overline !== undefined) requireVisibleText(overline, "overline");
}
