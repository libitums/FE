// 레슨 · 문화 노드의 묶음 아이콘입니다(ADR-0101) — 스텝 id → 묶음 → @libitums/icons. 던지지 않습니다.
// 묶음은 콘텐츠 스텝 id 규칙(S1 ~ S8 · CULT)에서 정합니다 — 콘텐츠 JSON에 키를 더하지 않습니다(사용자 결정 2026-11-04).

import card from "@libitums/icons/lynx/card";
import dumbbell from "@libitums/icons/lynx/dumbbell";
import earth from "@libitums/icons/lynx/earth";
import light from "@libitums/icons/lynx/light";
import mic from "@libitums/icons/lynx/mic";
import play from "@libitums/icons/lynx/play";

import type { CatalogUnitKey } from "../../lib/catalog-progress";

export type CatalogUnitGroup = "learn" | "item" | "drill" | "speak" | "culture";

const groupByStep: Readonly<Record<string, CatalogUnitGroup>> = {
  S1: "learn",
  S3: "learn",
  S2: "item",
  S4: "item",
  S5: "drill",
  S6: "drill",
  S7: "speak",
  CULT: "culture",
};

const iconByGroup: Readonly<Record<CatalogUnitGroup, string>> = {
  learn: light,
  item: card,
  drill: dumbbell,
  speak: mic,
  culture: earth,
};

/** 스텝 id → 묶음. 표 밖(S8 이후 · RP · INT …)은 null. */
export function catalogUnitGroupOf(stepId: CatalogUnitKey): CatalogUnitGroup | null {
  return Object.prototype.hasOwnProperty.call(groupByStep, stepId)
    ? (groupByStep[stepId] ?? null)
    : null;
}

/** 역할 · 스텝 id → 아이콘(SVG 문자열). 문화 역할은 늘 earth, 레슨은 묶음 아이콘이고 모르면 play. */
export function catalogUnitIconOf(role: "lesson" | "culture", stepId: CatalogUnitKey): string {
  if (role === "culture") return earth;
  const group = catalogUnitGroupOf(stepId);
  return group === null ? play : iconByGroup[group];
}
