import type { IconPosition } from "../button/button.contract";
import { resolveMotion, type Motion } from "../motion/motion.contract";
import type { OverlayPhase } from "../overlay/overlay.contract";

export type DialogMotion = Motion;
export type DialogPhase = OverlayPhase;

export type DialogAction = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly icon?: string;
  readonly iconPosition?: IconPosition;
};

export type DialogProps = {
  readonly title: string;
  readonly description?: string;
  readonly actions: readonly DialogAction[];
  readonly motion?: DialogMotion;
  readonly phase?: DialogPhase;
  readonly bindaction: (id: string) => void;
  readonly bindmotionend?: () => void;
};

export type DialogActionContract = DialogAction & {
  readonly variant: "brand" | "subtle";
};

export type DialogContract = {
  readonly actions: readonly DialogActionContract[];
  /** 뒤로가기 · ESC가 연결할 아래쪽 액션 id입니다. 로딩 중인 액션이 있으면 `null`(취소 경로 없음). */
  readonly cancelActionId: string | null;
  readonly className: string;
  readonly description: string | undefined;
  readonly motion: DialogMotion;
  readonly phase: DialogPhase;
  readonly title: string;
};

function requireNonEmpty(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Dialog ${field} must not be empty`);
  }
  return value;
}

export function getDialogContract(
  props: DialogProps,
  contextMotion: Motion = "standard",
): DialogContract {
  const title = requireNonEmpty(props.title, "title");
  if (props.actions.length < 1 || props.actions.length > 2) {
    throw new Error("Dialog requires one or two actions");
  }

  const ids = new Set<string>();
  const actions = props.actions.map((action, index): DialogActionContract => {
    const id = requireNonEmpty(action.id, "action id");
    const label = requireNonEmpty(action.label, "action label");
    if (ids.has(id)) throw new Error("Dialog action ids must be unique");
    ids.add(id);
    return { ...action, id, label, variant: index === 0 ? "brand" : "subtle" };
  });

  if (!actions.some((action) => action.loading === true || action.disabled !== true)) {
    throw new Error("Dialog requires at least one interactive or loading action");
  }
  const busy = actions.some((action) => action.loading === true);

  const motion = resolveMotion(props.motion, contextMotion);
  const phase = props.phase ?? "entering";
  const description = props.description?.trim() ? props.description : undefined;
  return {
    actions,
    cancelActionId: busy ? null : actions[actions.length - 1]!.id,
    className: `ui-lynx-dialog ui-lynx-dialog-motion-${motion} ui-lynx-dialog-phase-${phase}`,
    description,
    motion,
    phase,
    title,
  };
}
