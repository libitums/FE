// 체험판 모델의 영어(뜻풀이 · 안내 · 힌트 번역)를 번역표로 바꾸는 순수 함수입니다 — 앱의 `localizeEpisode`(ADR-0091 D2)와 같은 생각.
// 표에 없는 영어는 그대로 두고, 한국어 · 로마자 · id · 주소는 손대지 않습니다. 표가 null이면 **같은 객체**를 돌려줍니다.

import type { TrialTranslationTable } from "./content/u00-translations";
import type { TrialModel } from "./trial-model.contract";

/** 영어가 실리는 키 — `TrialText.en` · `TrialOption.en` · 고르기 `instruction` · IMG_MATCH `prompt` · 턴 `replyTranslation`. */
const englishKeys = new Set(["en", "instruction", "prompt", "replyTranslation"]);

function localizeValue(value: unknown, table: TrialTranslationTable): unknown {
  if (Array.isArray(value)) return value.map((item) => localizeValue(item, table));
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, inner]) => [
      key,
      // 자기 키만 본다 — 「constructor」 같은 영어가 프로토타입의 함수를 집어 오지 않게.
      englishKeys.has(key) && typeof inner === "string"
        ? Object.hasOwn(table, inner)
          ? table[inner]
          : inner
        : localizeValue(inner, table),
    ]),
  );
}

/** 모델의 영어 칸을 표로 바꾼 사본. 표가 null이면 같은 객체. */
export function localizeTrialModel(
  model: TrialModel,
  table: TrialTranslationTable | null,
): TrialModel {
  if (table === null) return model;
  return localizeValue(model, table) as TrialModel;
}

/** 모델에 실린 영어 문장 전부 — 번역표의 빠진 키를 재는 데 씁니다. */
export function englishStringsOf(model: TrialModel): readonly string[] {
  const found = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value !== null && typeof value === "object") {
      for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
        if (englishKeys.has(key) && typeof inner === "string" && inner.trim() !== "") {
          found.add(inner);
        } else walk(inner);
      }
    }
  };
  walk(model);
  return [...found];
}
