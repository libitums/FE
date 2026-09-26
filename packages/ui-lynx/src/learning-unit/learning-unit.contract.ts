import { color } from "@libitums/design-tokens";

export type LearningUnitStatus = "default" | "available" | "active" | "clear";
export type LearningUnitNarrative = "none" | "narrative";

export type LearningUnitProps = {
  /**
   * 이 유닛을 가려내는 이름입니다. 한 화면에 유닛이 여럿 서는 것이 이 컴포넌트의 기본
   * 용법이라(여정 맵의 스텝 다섯), 주지 않으면 `data-testid`가 모두 같아 어느 유닛인지
   * 가릴 수 없습니다. 값은 `data-testid` 뒤에 붙습니다.
   */
  readonly id?: string;
  readonly accessibilityLabel: string;
  readonly icon: string;
  readonly status?: LearningUnitStatus;
  readonly narrative?: LearningUnitNarrative;
  /** ReactLynx 호스트가 키보드 focus-visible 상태를 전달합니다. */
  readonly focused?: boolean;
  readonly bindtap?: () => void;
};

export type LearningUnitContract = {
  readonly testId: string;
  readonly status: LearningUnitStatus;
  readonly narrative: LearningUnitNarrative;
  readonly className: string;
  readonly accessibilityLabel: string;
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
  if (props.id !== undefined && (typeof props.id !== "string" || !props.id.trim())) {
    throw new Error("LearningUnit id must not be empty");
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

  // 상태와 이야기 연결은 둘 다 **이름 뒤 접미사**로 냅니다(ADR-0016 D3). 원래 상태는
  // `accessibility-value`였는데, iOS 실기에서 그 값이 낭독되지 않는 것이 확인돼 D3이
  // 그 속성을 통째로 걷었습니다 — 여기만 되살리면 상태가 조용히 안 읽힙니다.
  //
  // 접미사가 붙는 상태와 붙지 않는 상태가 갈립니다(ADR-0016 D13이 가르는 축).
  // `default`는 조작할 수 없다는 것이, `active` · `clear`는 진행 위치가 알릴 값어치가
  // 있습니다. `available`만 접미사가 없습니다 — 열려 있고 아직 손대지 않은 평범한
  // 상태라, 목록을 훑을 때마다 항목 수만큼 더 읽히는 값을 치를 이유가 없습니다.
  const statusSuffix =
    status === "default"
      ? "잠김"
      : status === "active"
        ? "현재 항목"
        : status === "clear"
          ? "완료됨"
          : undefined;

  return {
    testId: props.id ? `ui-lynx-learning-unit-${props.id}` : "ui-lynx-learning-unit",
    status,
    narrative,
    className,
    accessibilityLabel: [
      props.accessibilityLabel.trim(),
      statusSuffix,
      narrative === "narrative" ? "이야기 연결" : undefined,
    ]
      .filter((value): value is string => value !== undefined)
      .join(", "),
    traits: interactive ? "button" : "disabled",
    interactive,
    iconKind,
    iconColor,
    ringColor,
    focused,
  };
}
