import { root, useEffect, useInitData, useState } from "@lynx-js/react";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";
import type {
  OptionSelectorCommit,
  OptionSelectorLayout,
  OptionSelectorOption,
  OptionSelectorSelection,
  OptionSelectorSize,
  OptionSelectorVariant,
} from "@libitums/ui-lynx/option-selector";

import type { OptionSelectorStoryArgs } from "../story-types";
import "./story-canvas.css";

const variants = new Set<OptionSelectorVariant>(["filled", "outlined"]);
const sizes = new Set<OptionSelectorSize>(["s", "m", "l"]);
const selections = new Set<OptionSelectorSelection>(["single", "multiple"]);
const commits = new Set<OptionSelectorCommit>(["deferred", "immediate"]);
const layouts = new Set<OptionSelectorLayout>(["stack", "grid"]);

const shortOptions: readonly OptionSelectorOption[] = [
  { id: "coffee", label: "Coffee" },
  { id: "tea", label: "Tea" },
  { id: "juice", label: "Juice" },
  { id: "water", label: "Water" },
];

const longOptions: readonly OptionSelectorOption[] = [
  { id: "coffee", label: "Could I get a large iced coffee with oat milk, please?" },
  { id: "tea", label: "I'd like a cup of hot green tea." },
  { id: "water", label: "Just water is fine, thank you." },
];

function App() {
  const args = useInitData() as Partial<OptionSelectorStoryArgs>;
  const variant = variants.has(args.variant as OptionSelectorVariant)
    ? (args.variant as OptionSelectorVariant)
    : "outlined";
  const size = sizes.has(args.size as OptionSelectorSize) ? (args.size as OptionSelectorSize) : "m";
  const selection = selections.has(args.selection as OptionSelectorSelection)
    ? (args.selection as OptionSelectorSelection)
    : "single";
  // Multiple은 Deferred만 허용하므로 controls 조합이 어긋나면 Deferred로 되돌린다.
  const requestedCommit = commits.has(args.commit as OptionSelectorCommit)
    ? (args.commit as OptionSelectorCommit)
    : "deferred";
  const commit: OptionSelectorCommit = selection === "multiple" ? "deferred" : requestedCommit;
  const layout = layouts.has(args.layout as OptionSelectorLayout)
    ? (args.layout as OptionSelectorLayout)
    : "stack";
  const learning = args.contentLanguage === "learning";
  const baseOptions = args.longLabels === true ? longOptions : shortOptions;
  const options = baseOptions.map((option, index) =>
    args.disabledLast === true && index === baseOptions.length - 1
      ? { ...option, disabled: true }
      : option,
  );
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [committed, setCommitted] = useState(args.committed === true);

  useEffect(() => {
    setSelectedIds([]);
    setCommitted(args.committed === true);
  }, [selection, commit, args.longLabels, args.committed]);

  function emit(name: "onChange" | "onCommit", payload: unknown) {
    "background only";
    NativeModules.bridge?.call?.("STORYBOOK_ACTION", { name, args: [payload] }, () => undefined);
  }

  function handleChange(ids: readonly string[]) {
    "background only";
    setSelectedIds(ids);
    emit("onChange", ids);
  }

  function handleCommit(id: string) {
    "background only";
    setCommitted(true);
    emit("onCommit", id);
  }

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Option Selector</text>
        <OptionSelector
          groupLabel="알맞은 응답을 고르세요"
          options={options}
          selectedIds={selectedIds}
          onChange={handleChange}
          onCommit={handleCommit}
          committed={committed}
          variant={variant}
          size={size}
          selection={selection}
          commit={commit}
          layout={layout}
          {...(learning
            ? { contentLanguage: "learning" as const, languageTag: "en-US" }
            : { contentLanguage: "ui" as const })}
        />
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
