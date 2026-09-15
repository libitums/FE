import type { ReactNode } from "@lynx-js/react";

export type CardPadding = "m" | "l";
export type CardDirection = "ltr" | "rtl";
export type CardAccessibilityRole = "link" | "button";

type CardBaseProps = {
  readonly children: ReactNode;
  readonly padding?: CardPadding;
  readonly direction?: CardDirection;
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
  const className = [
    "ui-lynx-card",
    `ui-lynx-card-${padding}`,
    `ui-lynx-card-${direction}`,
    interaction === "interactive" ? "ui-lynx-card-interactive" : "ui-lynx-card-static",
  ].join(" ");

  if (props.interaction !== "interactive") {
    return {
      interaction,
      padding,
      direction,
      className,
      focusable: false,
      accessibilityElement: false,
    };
  }

  const accessibilityLabel = requireVisibleText(props.accessibilityLabel, "accessibilityLabel");
  const accessibilityDescription = props.accessibilityDescription?.trim();
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
