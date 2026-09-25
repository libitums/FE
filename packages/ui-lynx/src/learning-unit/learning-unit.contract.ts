import { color } from "@libitums/design-tokens";

export type LearningUnitStatus = "default" | "available" | "active" | "clear";
export type LearningUnitNarrative = "none" | "narrative";

export type LearningUnitProps = {
  readonly accessibilityLabel: string;
  readonly icon: string;
  readonly status?: LearningUnitStatus;
  readonly narrative?: LearningUnitNarrative;
  /** ReactLynx 호스트가 키보드 focus-visible 상태를 전달합니다. */
  readonly focused?: boolean;
  readonly bindtap?: () => void;
};

export type LearningUnitContract = {
  readonly status: LearningUnitStatus;
  readonly narrative: LearningUnitNarrative;
  readonly className: string;
  readonly accessibilityLabel: string;
  readonly accessibilityValue?: "현재 항목" | "완료됨";
  readonly traits: "button" | "disabled";
  readonly interactive: boolean;
  readonly iconKind: "learning" | "lock" | "tick";
  readonly iconColor: string;
  readonly ringColor: string;
  readonly focused: boolean;
};

const statuses = new Set<LearningUnitStatus>(["default", "available", "active", "clear"]);
const narratives = new Set<LearningUnitNarrative>(["none", "narrative"]);

export function getLearningUnitContract(props: LearningUnitProps): LearningUnitContract {
  if (!props || typeof props !== "object") {
    throw new Error("LearningUnit props must be an object");
  }
  if (typeof props.accessibilityLabel !== "string" || !props.accessibilityLabel.trim()) {
    throw new Error("LearningUnit accessibilityLabel must not be empty");
  }
  if (typeof props.icon !== "string" || !props.icon.trim()) {
    throw new Error("LearningUnit icon must not be empty");
  }

  const status = props.status ?? "default";
  const narrative = props.narrative ?? "none";
  if (!statuses.has(status)) throw new Error(`Unsupported LearningUnit status: ${status}`);
  if (!narratives.has(narrative)) {
    throw new Error(`Unsupported LearningUnit narrative: ${narrative}`);
  }
  if (props.focused !== undefined && typeof props.focused !== "boolean") {
    throw new Error("LearningUnit focused must be a boolean");
  }
  if (props.bindtap !== undefined && typeof props.bindtap !== "function") {
    throw new Error("LearningUnit bindtap must be a function");
  }

  const interactive = status !== "default";
  const focused = interactive && props.focused === true;
  const className = [
    "ui-lynx-learning-unit",
    `ui-lynx-learning-unit-${status}`,
    narrative === "narrative" ? "ui-lynx-learning-unit-narrative" : undefined,
    focused ? "ui-lynx-learning-unit-focused" : undefined,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ");

  const iconKind = status === "default" ? "lock" : status === "clear" ? "tick" : "learning";
  const iconColor =
    status === "default"
      ? color.gray[700]
      : status === "available"
        ? color.brand.primary
        : color.white;
  const ringColor = status === "clear" ? color.feedback.correct : color.gray[400];

  return {
    status,
    narrative,
    className,
    accessibilityLabel:
      narrative === "narrative"
        ? `${props.accessibilityLabel.trim()}, 이야기 연결`
        : props.accessibilityLabel.trim(),
    accessibilityValue:
      status === "active" ? "현재 항목" : status === "clear" ? "완료됨" : undefined,
    traits: interactive ? "button" : "disabled",
    interactive,
    iconKind,
    iconColor,
    ringColor,
    focused,
  };
}
