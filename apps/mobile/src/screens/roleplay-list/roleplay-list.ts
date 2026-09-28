// 롤플레이 목록 화면의 순수 로직입니다.
//
// **값을 import하지 않습니다.** `journeyMapItems`는 App이 넘깁니다
// (`docs/conventions/code.md` 「import」 — 화면 폴더 사이 값 금지). 그래서
// `roleplayItemsFrom`은 목록을 인자로 받습니다.

import type { JourneyMapItem, JourneyMapSection } from "../journey-map/journey-map";
import type {
  RoleplayEpisodeId,
  RoleplayFormLabel,
  RoleplayItem,
  RoleplaySection,
  RoleplayUnitForm,
} from "./roleplay-list.contract";

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

// 잠긴 항목은 이름 뒤에 상태를 붙입니다 — 구분자와 낱말은 여정 스텝의 `잠김`과
// 같습니다(ADR-0016 D3).
export function roleplayItemAccessibilityLabel(item: RoleplayItem, locked = false): string {
  const name = `${item.title}, ${roleplayFormLabel(item.form)}`;
  return locked ? `${name}, 잠김` : name;
}

/**
 * 여정의 구획들을 롤플레이 구획으로 옮깁니다. 입력 순서를 보존합니다.
 *
 * **에피소드는 여정에서 그 에피소드의 항목을 전부 끝냈을 때 열립니다.** 끝났는지는
 * 묻는 함수로 받습니다 — 완료의 출처(스텝 수 · 특별 유닛 완료 목록)는 여정의 것이고,
 * 이 화면 폴더는 그 값을 직접 볼 수 없습니다(`code.md` 「import」).
 *
 * 롤플레이 항목이 하나도 없는 에피소드는 구획을 만들지 않습니다 — 머리만 있고 카드가
 * 없는 구획은 보여 줄 것이 없습니다.
 */
export function roleplaySectionsFrom(
  sections: readonly JourneyMapSection[],
  isComplete: (item: JourneyMapItem) => boolean,
): readonly RoleplaySection[] {
  return sections.flatMap((section): readonly RoleplaySection[] => {
    const items = roleplayItemsFrom(section.items);
    if (items.length === 0) {
      return [];
    }
    return [
      {
        episodeId: section.episode.id,
        label: section.episode.label,
        title: section.episode.title,
        unlocked: section.items.every(isComplete),
        items,
      },
    ];
  });
}

export function findRoleplaySection(
  sections: readonly RoleplaySection[],
  episodeId: RoleplayEpisodeId,
): RoleplaySection | undefined {
  return sections.find((section) => section.episodeId === episodeId);
}

/** 구획 머리의 접근성 이름입니다. 잠긴 에피소드는 여는 조건까지 말합니다. */
export function roleplaySectionAccessibilityLabel(section: RoleplaySection): string {
  const name = `${section.label} ${section.title}`;
  return section.unlocked ? name : `${name}, 잠김, 여정에서 이 에피소드를 끝내면 열립니다`;
}
