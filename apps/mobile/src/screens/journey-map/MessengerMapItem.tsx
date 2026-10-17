import type { MessengerMapItemProps } from "../messenger/messenger.contract";

import { SpecialUnitMapItem } from "./SpecialUnitMapItem";

// 특별 유닛은 스텝 진행과 독립적으로 열려 있습니다 — 다만 **표지 뒤에서만** 그렇습니다
// (ADR-0024 D6). 그 구획의 표지를 끝내기 전에는 `locked`가 와서 잠긴 표식으로 서고 눌러도
// 무동작입니다. 표식 · 라벨 · 잠김 가드는 `SpecialUnitMapItem`이 집습니다.
export function MessengerMapItem({ id, title, status, onSelect }: MessengerMapItemProps) {
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
