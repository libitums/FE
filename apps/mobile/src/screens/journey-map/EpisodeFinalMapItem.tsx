import type { EpisodeFinalMapItemProps } from "../episode-final/episode-final.contract";

import { SpecialUnitMapItem } from "./SpecialUnitMapItem";

// 최종 테스트의 맵 항목입니다 — 다른 특별 유닛과 같은 어댑터이고, 잠긴 동안은 눌러도 아무 일이
// 없습니다(스텝 노드의 잠김과 같습니다).
export function EpisodeFinalMapItem({ id, title, status, onSelect }: EpisodeFinalMapItemProps) {
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
