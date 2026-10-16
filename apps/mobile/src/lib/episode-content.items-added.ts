import "background-only";

import type { DeliveryAddedItem } from "./episode-content.schema";
import type { AddedLearningItem } from "./episode-content.model";

// 2026-10-15에 더한 문항 11종의 와이어 → 모델 변환입니다. 순수 함수이고 던지지 않습니다.

/** 새 11종 와이어를 모델로. 아직 식별 키(`id` · `type` · `event`)만 싣습니다. */
export function toAddedItem(item: DeliveryAddedItem): AddedLearningItem {
  return { id: item.id, type: item.type, event: item.event } as AddedLearningItem;
}
