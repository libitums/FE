import type {
  OverlayBlur,
  OverlayMotion,
  OverlayPhase,
  OverlayScope,
  OverlaySurface,
} from "@libitums/ui-lynx/overlay";

export type OverlayStoryArgs = {
  scope: OverlayScope;
  surface: OverlaySurface;
  blur: OverlayBlur;
  dismiss: "none" | "tap";
  phase: OverlayPhase;
  motion: OverlayMotion;
  onDismiss: () => void;
};

export type OverlayStoryData = Omit<OverlayStoryArgs, "onDismiss">;

const scopes = new Set<OverlayScope>(["screen", "area"]);
const surfaces = new Set<OverlaySurface>(["sheet", "dialog"]);
const blurs = new Set<OverlayBlur>(["off", "on"]);
const phases = new Set<OverlayPhase>(["entering", "visible", "exiting"]);
const motions = new Set<OverlayMotion>(["standard", "reduced"]);

export function normalizeOverlayStoryArgs(input: unknown): OverlayStoryData {
  const args =
    input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const scope = scopes.has(args.scope as OverlayScope) ? (args.scope as OverlayScope) : "screen";
  const surface = surfaces.has(args.surface as OverlaySurface)
    ? (args.surface as OverlaySurface)
    : "sheet";
  const requestedDismiss = args.dismiss === "tap" ? "tap" : "none";

  return {
    scope,
    surface,
    blur: blurs.has(args.blur as OverlayBlur) ? (args.blur as OverlayBlur) : "off",
    dismiss: scope === "screen" && surface === "sheet" ? requestedDismiss : "none",
    phase: phases.has(args.phase as OverlayPhase) ? (args.phase as OverlayPhase) : "visible",
    motion: motions.has(args.motion as OverlayMotion) ? (args.motion as OverlayMotion) : "standard",
  };
}

export function dispatchOverlayStoryDismiss(
  data: OverlayStoryData,
  dispatch: (envelope: {
    readonly channel: "STORYBOOK_ACTION";
    readonly name: "onDismiss";
    readonly args: readonly [];
  }) => void,
): boolean {
  if (data.scope !== "screen" || data.surface !== "sheet" || data.dismiss !== "tap") return false;
  dispatch({ channel: "STORYBOOK_ACTION", name: "onDismiss", args: [] });
  return true;
}
