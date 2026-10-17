import type { Motion } from "../motion/motion.contract";

export type SpecialUnitStatus = "default" | "checking" | "available" | "active" | "clear";

export type SpecialUnitProps = {
  /** 한 화면에 여럿 서므로 testid 꼬리로 붙습니다(`ui-lynx-special-unit-<id>`). */
  readonly id?: string;
  /** 상위 목록이 조합한 이름(보조 라벨 + 제목)입니다. 상태 접미사는 컴포넌트가 붙입니다. */
  readonly accessibilityLabel: string;
  readonly status?: SpecialUnitStatus;
  /** ReactLynx 호스트가 키보드 focus-visible 상태를 전달합니다. Available · Active · Clear에서만 효력이 있습니다. */
  readonly focused?: boolean;
  readonly bindtap?: () => void;
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

export function getSpecialUnitContract(
  _props: SpecialUnitProps,
  _contextMotion: Motion = "standard",
): SpecialUnitContract {
  return {
    testId: "ui-lynx-special-unit",
    status: "default",
    className: "",
    accessibilityLabel: "",
    traits: "disabled",
    interactive: false,
    iconColor: "",
    focused: false,
  };
}

/** reduced이고 Default · Checking이 아니면 true — 눌림 막을 렌더한다. */
export function hasSpecialUnitPressedShade(_status: SpecialUnitStatus, _motion: Motion): boolean {
  return false;
}
