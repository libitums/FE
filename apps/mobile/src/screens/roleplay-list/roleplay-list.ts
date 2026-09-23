// 롤플레이 목록 화면의 순수 로직입니다.
//
// **값을 import하지 않습니다.** `journeyMapItems`는 App이 넘깁니다
// (`docs/conventions/code.md` 「import」 — 화면 폴더 사이 값 금지). 그래서
// `roleplayItemsFrom`은 목록을 인자로 받습니다.

import type { JourneyMapItem } from "../journey-map/journey-map";
import type { RoleplayFormLabel, RoleplayItem, RoleplayUnitForm } from "./roleplay-list.contract";

// 입력 순서를 보존합니다. `kind: "standard"`는 기여 0입니다. 판별은 `default` 없는
// `switch`로 합니다 — 여정 항목 종류가 늘면 반환 경로가 비어 `TS2366`이 섭니다.
export function roleplayItemsFrom(items: readonly JourneyMapItem[]): readonly RoleplayItem[] {
  return items.flatMap((item): readonly RoleplayItem[] => {
    switch (item.kind) {
      case "standard": {
        return [];
      }
      case "special": {
        return [{ form: "messenger", unitId: item.id, title: item.title }];
      }
      case "phone-call": {
        return [{ form: "phone-call", unitId: item.id, title: item.title }];
      }
      case "visual-novel": {
        return [{ form: "visual-novel", unitId: item.id, title: item.title }];
      }
    }
  });
}

// export하지 않는 사상 표입니다.
const roleplayFormLabelByForm: Record<RoleplayUnitForm, RoleplayFormLabel> = {
  messenger: "메신저",
  "phone-call": "전화",
  "visual-novel": "비주얼 노벨",
};

export function roleplayFormLabel(form: RoleplayUnitForm): RoleplayFormLabel {
  return roleplayFormLabelByForm[form];
}

export function roleplayItemAccessibilityLabel(item: RoleplayItem): string {
  return `${item.title}, ${roleplayFormLabel(item.form)}`;
}
