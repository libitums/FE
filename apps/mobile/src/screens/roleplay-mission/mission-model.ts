// 미션 화면의 순수 표시 규칙입니다 — 값 줄 · 목록 항목 · 미션 칸. UI를 import하지 않습니다.

import type { RoleplayMissionCopy } from "../../lib/ui-copy-roleplay-mission";
import type { MissionCard, MissionList, MissionPrice } from "./roleplay-mission.contract";

/** 이번 판의 값 — 하루 무료가 남았으면 그것, 아니면 엽전 정액과 잔액(PRD §3.9). */
export function missionPriceLine(price: MissionPrice, copy: RoleplayMissionCopy): string {
  return price.freeLeft > 0
    ? copy.priceFree(price.freeLeft)
    : copy.priceCoins(price.cost, price.balance);
}

/** 목록에서 미션 하나의 칸을 만듭니다. 목록에 없는 미션이면 `null`. */
export function missionCardOf(
  list: MissionList,
  missionId: string,
  imageUrlOf: (episodeId: string) => string | null,
  ordinalOf: (episodeId: string) => number | null,
): MissionCard | null {
  const item = list.missions.find((entry) => entry.id === missionId);
  return item === undefined
    ? null
    : {
        item,
        price: list.price,
        imageUrl: imageUrlOf(item.episodeId),
        ordinal: ordinalOf(item.episodeId),
      };
}
