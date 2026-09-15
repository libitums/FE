import type { DialogMotion } from "@libitums/ui-lynx/dialog";

export type DialogStoryActionData = {
  readonly id: "continue" | "quit";
  readonly label: string;
  readonly disabled?: boolean;
};

export type DialogInitData = {
  readonly title: string;
  readonly description: string | undefined;
  readonly actions: readonly DialogStoryActionData[];
  readonly motion: DialogMotion;
};

export type DialogStoryActionEnvelope = {
  readonly channel: "STORYBOOK_ACTION";
  readonly name: "onAction";
  readonly args: readonly [id: string];
};

export function normalizeDialogStoryArgs(input: unknown): DialogInitData {
  const args =
    input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const title =
    typeof args.title === "string" && args.title.trim() ? args.title : "학습을 그만둘까요?";
  const description =
    typeof args.description === "string" && args.description ? args.description : undefined;
  const actionCount = args.actionCount === 1 ? 1 : 2;
  const disabledLast = args.disabledLast === true;
  const actions: DialogStoryActionData[] = [{ id: "continue", label: "계속 학습하기" }];
  if (actionCount === 2) {
    actions.push({ id: "quit", label: "그만두기", disabled: disabledLast || undefined });
  }

  return {
    title,
    description,
    actions,
    motion: args.motion === "reduced" ? "reduced" : "standard",
  };
}

export function dispatchDialogStoryAction(
  data: DialogInitData,
  id: string,
  bridge: (envelope: DialogStoryActionEnvelope) => void,
): boolean {
  const action = data.actions.find((candidate) => candidate.id === id);
  if (!action || action.disabled) return false;
  bridge({ channel: "STORYBOOK_ACTION", name: "onAction", args: [id] });
  return true;
}
