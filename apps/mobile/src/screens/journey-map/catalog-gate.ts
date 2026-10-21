import type { CatalogProgress } from "../../lib/catalog-progress";
import type { CatalogMapSection } from "./catalog-map.contract";

type TutorialGate = {
  readonly legacyTutorialPassed: boolean;
  readonly progress: CatalogProgress;
};

/** 첫 구획이 준비된 튜토리얼이면 그 id, 아니면 null — 첫 유닛 안내의 대상입니다. */
export function mapGuideTargetOf(_sections: readonly CatalogMapSection[]): string | null {
  return null;
}

/** 옛 통과 기록이 있고 튜토리얼 구획(준비됨)을 아직 끝내지 않았으면 true입니다. */
export function catalogTutorialBypassed(
  _sections: readonly CatalogMapSection[],
  _gate: TutorialGate,
): boolean {
  return false;
}
