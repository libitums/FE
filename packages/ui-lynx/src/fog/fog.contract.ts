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

const fogDirections: readonly FogDirection[] = ["top", "bottom", "start", "end"];
const fogSizes: readonly FogSize[] = ["s", "m", "full"];
const fogColors: readonly FogColor[] = [
  "white",
  "surface-default",
  "surface-basement",
  "surface-floating",
  "dark",
];
const fogVisibilities: readonly FogVisibility[] = ["hidden", "visible"];
const fogLayoutDirections: readonly FogLayoutDirection[] = ["ltr", "rtl"];

function validateFogProps(props: FogProps): void {
  if (props === null || typeof props !== "object") {
    throw new Error("Fog props must be an object");
  }
  if (!fogDirections.includes(props.direction)) {
    throw new Error("Fog direction must be top, bottom, start, or end");
  }
  if (props.size !== undefined && !fogSizes.includes(props.size)) {
    throw new Error("Fog size must be s, m, or full");
  }
  if (props.color !== undefined && !fogColors.includes(props.color)) {
    throw new Error("Fog color must match a supported surface");
  }
  if (props.visibility !== undefined && !fogVisibilities.includes(props.visibility)) {
    throw new Error("Fog visibility must be hidden or visible");
  }
  if (props.layoutDirection !== undefined && !fogLayoutDirections.includes(props.layoutDirection)) {
    throw new Error("Fog layoutDirection must be ltr or rtl");
  }
}

export function getFogContract(props: FogProps): FogContract {
  validateFogProps(props);

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
