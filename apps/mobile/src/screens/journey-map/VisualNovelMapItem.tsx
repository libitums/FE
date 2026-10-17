import type { VisualNovelMapItemProps } from "../visual-novel/visual-novel.contract";

import { SpecialUnitMapItem } from "./SpecialUnitMapItem";

// `MessengerMapItem`과 같은 어댑터입니다 — 잠김도 같습니다.
export function VisualNovelMapItem({ id, title, status, onSelect }: VisualNovelMapItemProps) {
  return (
    <SpecialUnitMapItem
      unitId={id}
      title={title}
      accessibilityName={title}
      status={status}
      onSelect={() => {
        "background only";
        onSelect(id);
      }}
    />
  );
}
