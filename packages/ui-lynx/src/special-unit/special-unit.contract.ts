import { color } from "@libitums/design-tokens";
import { motionClassName, type Motion } from "../motion/motion.contract";

export type SpecialUnitStatus = "default" | "checking" | "available" | "active" | "clear";

/** 탭 이벤트 — 맵이 말풍선을 탭한 자리에 띄우려고 세로 좌표를 읽습니다(`LearningUnitTapEvent`와 같은 꼴). */
export type SpecialUnitTapEvent = {
  readonly detail?: { readonly y?: number };
};

export type SpecialUnitProps = {
  /** 한 화면에 여럿 서므로 testid 꼬리로 붙습니다(`ui-lynx-special-unit-<id>`). */
  readonly id?: string;
  /** 상위 목록이 조합한 이름(보조 라벨 + 제목)입니다. 상태 접미사는 컴포넌트가 붙입니다. */
  readonly accessibilityLabel: string;
  readonly status?: SpecialUnitStatus;
  /** ReactLynx 호스트가 키보드 focus-visible 상태를 전달합니다. Available · Active · Clear에서만 효력이 있습니다. */
  readonly focused?: boolean;
  readonly bindtap?: (event: SpecialUnitTapEvent) => void;
};

export type SpecialUnitContract = {
  readonly testId: string;
  readonly status: SpecialUnitStatus;
  readonly className: string;
  readonly accessibilityLabel: string;
  readonly traits: "button" | "disabled";
  readonly interactive: boolean;
  readonly iconColor: string;
  readonly focused: boolean;
};

const statuses = new Set<SpecialUnitStatus>([
  "default",
  "checking",
  "available",
  "active",
  "clear",
]);

// Available만 접미사가 없습니다 — 열려 있고 손대지 않은 평범한 상태라 목록을 훑을 때마다 읽을 값어치가 없습니다.
const statusSuffixes: Readonly<Record<SpecialUnitStatus, string | undefined>> = {
  default: "locked",
  checking: "loading",
  available: undefined,
  active: "current",
  clear: "completed",
};

export function getSpecialUnitContract(
  props: SpecialUnitProps,
  contextMotion: Motion = "standard",
): SpecialUnitContract {
  if (!props || typeof props !== "object") {
    throw new Error("SpecialUnit props must be an object");
  }
  if (typeof props.accessibilityLabel !== "string" || !props.accessibilityLabel.trim()) {
    throw new Error("SpecialUnit accessibilityLabel must not be empty");
  }

  const status = props.status ?? "default";
  if (!statuses.has(status)) throw new Error(`Unsupported SpecialUnit status: ${status}`);
  if (props.id !== undefined && (typeof props.id !== "string" || !props.id.trim())) {
    throw new Error("SpecialUnit id must not be empty");
  }
  if (props.focused !== undefined && typeof props.focused !== "boolean") {
    throw new Error("SpecialUnit focused must be a boolean");
  }
  if (props.bindtap !== undefined && typeof props.bindtap !== "function") {
    throw new Error("SpecialUnit bindtap must be a function");
  }

  const interactive = status !== "default" && status !== "checking";
  const focused = interactive && props.focused === true;
  const className = [
    "ui-lynx-special-unit",
    `ui-lynx-special-unit-${status}`,
    focused ? "ui-lynx-special-unit-focused" : undefined,
    motionClassName("ui-lynx-special-unit", contextMotion),
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ");

  // 아이콘 색은 SVG 문자열 안이라 CSS 변수를 못 씁니다 — 토큰의 JS 값을 고릅니다.
  // 「확인 중」은 면(gray-300)보다 한 단계 진한 회색으로 자리만 잡습니다.
  const iconColor = status === "checking" ? color.gray[400] : color.white;
  const suffix = statusSuffixes[status];

  return {
    testId: props.id ? `ui-lynx-special-unit-${props.id}` : "ui-lynx-special-unit",
    status,
    className,
    accessibilityLabel: [props.accessibilityLabel.trim(), suffix]
      .filter((value): value is string => value !== undefined)
      .join(", "),
    traits: interactive ? "button" : "disabled",
    interactive,
    iconColor,
    focused,
  };
}

/** reduced이고 Default · Checking이 아니면 true — 눌림 막을 렌더한다. */
export function hasSpecialUnitPressedShade(status: SpecialUnitStatus, motion: Motion): boolean {
  return motion === "reduced" && status !== "default" && status !== "checking";
}
