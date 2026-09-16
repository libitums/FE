export type FogDirection = "top" | "bottom" | "start" | "end";
export type FogSize = "s" | "m" | "full";
export type FogColor =
  | "white"
  | "surface-default"
  | "surface-basement"
  | "surface-floating"
  | "dark";
export type FogVisibility = "hidden" | "visible";
export type FogLayoutDirection = "ltr" | "rtl";

export type FogProps = {
  readonly direction: FogDirection;
  readonly size?: FogSize;
  readonly color?: FogColor;
  readonly visibility?: FogVisibility;
  readonly layoutDirection?: FogLayoutDirection;
  readonly children?: never;
};

export type FogContract = Required<Omit<FogProps, "children">> & {
  readonly className: string;
};

export function getFogContract(props: FogProps): FogContract {
  const size = props.size ?? "m";
  const color = props.color ?? "surface-default";
  const visibility = props.visibility ?? "visible";
  const layoutDirection = props.layoutDirection ?? "ltr";

  return {
    className: [
      "ui-lynx-fog",
      `ui-lynx-fog-${props.direction}`,
      `ui-lynx-fog-size-${size}`,
      `ui-lynx-fog-color-${color}`,
      `ui-lynx-fog-${visibility}`,
      `ui-lynx-fog-${layoutDirection}`,
    ].join(" "),
    color,
    direction: props.direction,
    layoutDirection,
    size,
    visibility,
  };
}
