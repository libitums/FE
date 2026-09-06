// 문화 학습 화면의 순수 로직 + 고정 데이터 (ADR-0006 D4 — 순수 로직은 unit 계층 대상).
//
// LIB-238 (logic-scaffold): import 가능한 무동작 껍데기다. 타입 하나와 순수 함수
// 둘을 계약된 경로·이름·시그니처로 세운다. 서사 데이터와 판정 동작은 다음 `logic`
// 단계가 채운다. DOM·컴포넌트·저장소를 만지지 않는다.
//
// UI를 import하지 않는다 — 화면 폴더에 있지만 화면 컴포넌트를 참조하지 않는
// 순수 모듈이다 (listening.ts · journey-map.ts · assessment.ts와 같은 형태).

import type { JourneyStepId } from "../journey-map/journey-map";

// ---------------------------------------------------------------- 도메인 타입 (계약 §2.2)
// 옵셔널 필드가 없다. `imageSource?` 같은 필드를 만들지 않는다 — `x?`면 「아직 없는
// 서사」가 타입에 생긴다. 이미지는 보류다.

export type CultureNarrative = {
  /** 서사의 제목. 화면 제목(`N단계 · 문화`)과 다른 것이고, 서사 데이터가 진다. */
  readonly title: string;
  /** 서사 본문. 배열 순서가 곧 읽는 순서다. 빈 배열이 아니다(§3.1 표의 불변식). */
  readonly paragraphs: readonly string[];
};

// ---------------------------------------------------------------- 순수 함수 (계약 §2.3)

// 무동작 껍데기다 — `logic` 단계가 채운다. 인자는 계약된 시그니처라 지우지 않는다.
// eslint-disable-next-line no-unused-vars -- 무동작 껍데기: logic 단계가 본문을 채우면 쓰인다
export function cultureScreenTitle(ordinal: number): string {
  return "";
}

// 무동작 껍데기다 — `logic` 단계가 채운다. 인자는 계약된 시그니처라 지우지 않는다.
// eslint-disable-next-line no-unused-vars -- 무동작 껍데기: logic 단계가 본문을 채우면 쓰인다
export function cultureNarrativeForStep(id: JourneyStepId): CultureNarrative {
  return { title: "", paragraphs: [] };
}
