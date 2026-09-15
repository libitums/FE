import type { IconPosition } from "../button/button.contract";

export type DialogMotion = "standard" | "reduced";

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
  readonly bindaction: (id: string) => void;
};

export type DialogActionContract = DialogAction & {
  readonly variant: "brand" | "subtle";
};

export type DialogContract = {
  readonly actions: readonly DialogActionContract[];
  readonly cancelActionId: string;
  readonly className: string;
  readonly description: string | undefined;
  readonly motion: DialogMotion;
  readonly title: string;
};

function requireNonEmpty(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Dialog ${field} must not be empty`);
  }
  return value;
}

export function getDialogContract(props: DialogProps): DialogContract {
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

  if (!actions.some((action) => !action.disabled && !action.loading)) {
    throw new Error("Dialog requires at least one interactive action");
  }

  const motion = props.motion ?? "standard";
  return {
    actions,
    cancelActionId: actions[actions.length - 1]!.id,
    className: `ui-lynx-dialog ui-lynx-dialog-motion-${motion}`,
    description: props.description,
    motion,
    title,
  };
}
