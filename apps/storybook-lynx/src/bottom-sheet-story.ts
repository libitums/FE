import type { BottomSheetDismissReason, BottomSheetMotion } from "@libitums/ui-lynx/bottom-sheet";

export type BottomSheetInitData = {
  readonly title: string;
  readonly overline: string;
  readonly description: string;
  readonly primaryActionLabel: string;
  readonly secondaryActionLabel: string;
  readonly showSecondaryAction: boolean;
  readonly draggable: boolean;
  readonly motion: BottomSheetMotion;
};

type BottomSheetStoryActionEnvelope = {
  readonly channel: "STORYBOOK_ACTION";
  readonly name: "onDismiss" | "onAction";
  readonly args: readonly [value: string];
};

export type BottomSheetStoryBridge = (envelope: BottomSheetStoryActionEnvelope) => void;

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function normalizeBottomSheetStoryArgs(input: unknown): BottomSheetInitData {
  const args =
    input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    title: stringOr(args.title, "잠깐 쉬어 갈까요?"),
    overline: stringOr(args.overline, "학습 도구"),
    description: stringOr(args.description, "오디오를 다시 듣고 이어서 학습할 수 있어요"),
    primaryActionLabel: stringOr(args.primaryActionLabel, "오디오 다시 듣기"),
    secondaryActionLabel: stringOr(args.secondaryActionLabel, "문장 다시 보기"),
    showSecondaryAction: args.showSecondaryAction === true,
    draggable: args.draggable !== false,
    motion: args.motion === "reduced" ? "reduced" : "standard",
  };
}

export function dispatchBottomSheetStoryDismiss(
  reason: BottomSheetDismissReason,
  bridge: BottomSheetStoryBridge,
): void {
  bridge({ channel: "STORYBOOK_ACTION", name: "onDismiss", args: [reason] });
}

export function dispatchBottomSheetStoryAction(
  id: "primary" | "secondary",
  bridge: BottomSheetStoryBridge,
): void {
  bridge({ channel: "STORYBOOK_ACTION", name: "onAction", args: [id] });
}
