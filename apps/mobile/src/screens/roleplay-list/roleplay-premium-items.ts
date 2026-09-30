// 결제 사용자를 위한 롤플레이의 임시 입력값 자리입니다 — 에피소드마다의 항목과 조회
// 함수 `premiumRoleplayItemsFor`를 소유합니다.

import type { PremiumRoleplayItem, RoleplayEpisodeId } from "./roleplay-list.contract";

// ⚠ 이음매입니다(「임시 입력값의 이음매」 — `docs/conventions/code.md`).
//
// **무엇이 임시인가** — 아래 항목의 `id` · `title` · `situation` 전부와 개수입니다.
// `PremiumRoleplayItem` 타입은 임시가 아닙니다.
//
// **무엇이 막고 있나** — 결제 롤플레이의 컨텐츠(대화)가 없고, 결제도 없습니다. 그래서
// 이 항목들은 **열 수 있는 화면이 없는 예고**입니다: 카드는 서지만 어느 항목도 대화로
// 이어지지 않습니다.
//
// **진짜가 오는 날 무엇이 바뀌나** — 이 표의 값과 출처, 그리고 항목이 여는 화면입니다.
// 그날 항목은 열 화면을 가리키는 필드를 얻습니다 — `RoleplayItem`이 `form`과
// `unitId`를 지는 것과 같은 자리입니다. 「형태는 안 바뀐다」고 적지 않습니다.
//
// **이 목록이 배정의 근거가 아닙니다** — 셋은 튜토리얼(카페)과 닮은 상황을 하나씩 둔
// 판정용 값입니다.
//
// export하지 않습니다 — 표를 내보내면 다음 사람이 직접 색인해 자기 답을 짓습니다.
const itemsByEpisode: Readonly<Record<RoleplayEpisodeId, readonly PremiumRoleplayItem[]>> = {
  tutorial: [
    {
      id: "premium-wrong-order",
      title: "My order came out wrong",
      situation: "Talk politely to the café staff",
    },
    {
      id: "premium-shared-table",
      title: "Can I share this table?",
      situation: "Share a table with another customer",
    },
    {
      id: "premium-regular-chat",
      title: "The owner of my regular café",
      situation: "Make some small talk",
    },
  ],
  // 아직 유닛이 없는 에피소드입니다 — 결제 롤플레이도 없습니다. 빈 목록이 맞고,
  // 키를 안 적으면 `Record` 전수성이 `TS2741`로 섭니다.
  customs: [],
};

/** 없는 에피소드는 빈 목록입니다 — 결제 롤플레이가 없는 에피소드는 오류가 아닙니다. */
export function premiumRoleplayItemsFor(
  episodeId: RoleplayEpisodeId,
): readonly PremiumRoleplayItem[] {
  return itemsByEpisode[episodeId] ?? [];
}
