export type OverlayBlur = "off" | "on";
export type OverlayMotion = "standard" | "reduced";
export type OverlayPhase = "entering" | "visible" | "exiting";
export type OverlayScope = "screen" | "area";
export type OverlaySurface = "sheet" | "dialog";

type OverlayBaseProps = {
  readonly blur?: OverlayBlur;
  readonly motion?: OverlayMotion;
  readonly phase?: OverlayPhase;
  readonly bindmotionend?: () => void;
  readonly children?: never;
};

export type AreaOverlayProps = OverlayBaseProps & {
  readonly scope: "area";
  readonly dismiss?: "none";
  readonly binddismiss?: never;
  readonly surface?: never;
};

type SheetOverlayBaseProps = OverlayBaseProps & {
  readonly scope: "screen";
  readonly surface: "sheet";
};

export type SheetOverlayProps = SheetOverlayBaseProps &
  (
    | {
        readonly dismiss?: "none";
        readonly binddismiss?: never;
      }
    | {
        readonly dismiss: "tap";
        readonly binddismiss: () => void;
      }
  );

export type DialogOverlayProps = OverlayBaseProps & {
  readonly scope: "screen";
  readonly surface: "dialog";
  readonly dismiss?: "none";
  readonly binddismiss?: never;
};

export type OverlayProps = AreaOverlayProps | SheetOverlayProps | DialogOverlayProps;

export type OverlayContract = {
  readonly blur: OverlayBlur;
  readonly className: string;
  readonly dismiss: "none" | "tap";
  readonly interactive: boolean;
  readonly motion: OverlayMotion;
  readonly phase: OverlayPhase;
  readonly scope: OverlayScope;
  readonly surface?: OverlaySurface;
};

export function getOverlayContract(props: OverlayProps): OverlayContract {
  const blur = props.blur ?? "off";
  const dismiss = props.dismiss ?? "none";
  const motion = props.motion ?? "standard";
  const phase = props.phase ?? "visible";
  const surface = props.scope === "screen" ? props.surface : undefined;

  if (dismiss === "tap" && props.scope !== "screen") {
    throw new Error("Overlay dismiss tap is only available for screen scope");
  }
  if (dismiss === "tap" && surface !== "sheet") {
    throw new Error("Overlay dismiss tap is only available for sheet surfaces");
  }
  if (dismiss === "tap" && typeof props.binddismiss !== "function") {
    throw new Error("Overlay dismiss tap requires binddismiss");
  }

  return {
    blur,
    className: [
      "ui-lynx-overlay",
      `ui-lynx-overlay-${props.scope}`,
      surface ? `ui-lynx-overlay-${surface}` : undefined,
      `ui-lynx-overlay-blur-${blur}`,
      `ui-lynx-overlay-motion-${motion}`,
      `ui-lynx-overlay-phase-${phase}`,
    ]
      .filter((value): value is string => value !== undefined)
      .join(" "),
    dismiss,
    interactive: dismiss === "tap",
    motion,
    phase,
    scope: props.scope,
    ...(surface ? { surface } : {}),
  };
}
