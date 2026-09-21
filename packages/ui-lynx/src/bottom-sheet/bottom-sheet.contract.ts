import type { ReactNode } from "@lynx-js/react";
import type { IconPosition } from "../button/button.contract";

export const BOTTOM_SHEET_DRAG_DISMISS_THRESHOLD = 48;

export type BottomSheetDismissReason = "scrim" | "close-button" | "drag";
export type BottomSheetMotion = "standard" | "reduced";

export type BottomSheetAction = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly icon?: string;
  readonly iconPosition?: IconPosition;
  readonly bindtap?: () => void;
};

export type BottomSheetProps = {
  readonly title: string;
  readonly closeAccessibilityLabel: string;
  readonly overline?: string;
  readonly description?: string;
  readonly actions?: readonly BottomSheetAction[];
  readonly draggable?: boolean;
  readonly motion?: BottomSheetMotion;
  readonly ondismiss: (reason: BottomSheetDismissReason) => void;
  /** 설명 아래·액션 위에 두는 임의 내용(예: 스크롤 목록). 이 자리는 스스로 스크롤하지 않는다 —
   *  스크롤과 가장자리 Fog는 소비자가 함께 둔다(Fog가 스크롤 밖에 있어야 따라 움직이지 않는다). */
  readonly children?: ReactNode;
};

export type BottomSheetContract = {
  readonly actions: readonly BottomSheetAction[];
  readonly className: string;
  readonly closeAccessibilityLabel: string;
  readonly description: string | undefined;
  readonly draggable: boolean;
  readonly hasBody: boolean;
  readonly motion: BottomSheetMotion;
  readonly overline: string | undefined;
  readonly title: string;
};

function requireNonEmpty(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`BottomSheet ${field} must not be empty`);
  }
  return value;
}

export function shouldDismissBottomSheetDrag(startY: number, endY: number): boolean {
  return endY - startY >= BOTTOM_SHEET_DRAG_DISMISS_THRESHOLD;
}

export function getBottomSheetContract(props: BottomSheetProps): BottomSheetContract {
  const title = requireNonEmpty(props.title, "title");
  const closeAccessibilityLabel = requireNonEmpty(
    props.closeAccessibilityLabel,
    "closeAccessibilityLabel",
  );
  const actions = props.actions ?? [];
  const actionIds = new Set<string>();

  for (const action of actions) {
    requireNonEmpty(action.id, "action id");
    requireNonEmpty(action.label, "action label");
    if (actionIds.has(action.id)) throw new Error("BottomSheet action ids must be unique");
    actionIds.add(action.id);
  }

  const motion = props.motion ?? "standard";
  const draggable = props.draggable ?? true;

  return {
    actions,
    className: `ui-lynx-bottom-sheet ui-lynx-bottom-sheet-motion-${motion}`,
    closeAccessibilityLabel,
    description: props.description,
    draggable,
    hasBody: props.description !== undefined,
    motion,
    overline: props.overline,
    title,
  };
}
