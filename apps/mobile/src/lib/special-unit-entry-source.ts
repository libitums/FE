// 특별 유닛 진입 출처 어휘의 정본 (LIB-255 계약 §2.1).
//
// lib/인 근거: 이 어휘를 세 화면 계약(이벤트 union)과 세 화면 컴포넌트(기본 라벨)와
// App이 쓴다 — 화면 셋 이상이고, 타입 이름이 가리키는 화면이 없다
// (docs/conventions/code.md 「import」의 승격 조건).
//
// **로직을 흘려 넣지 않는다.** 이 모듈은 어휘와 라벨 사상 하나다(`answerResultLabel`과
// 같은 저울). 연습 모드의 시작 입력은 각 화면 폴더에 둔다(계약 §2.7).
//
// LIB-255 (logic): 계약 §2.1의 표(journey → 맵으로, roleplay → 목록으로)를 그대로
// 옮긴다. export하지 않는 `Record` 하나가 사상의 정본이고, 출처가 늘면 표가
// `TS2741`로 선다(계약 §2.1).

export type SpecialUnitEntrySource = "journey" | "roleplay";

export type SpecialUnitExitLabel = "맵으로" | "목록으로";

const specialUnitExitLabelBySource: Record<SpecialUnitEntrySource, SpecialUnitExitLabel> = {
  journey: "맵으로",
  roleplay: "목록으로",
};

export function specialUnitExitLabel(source: SpecialUnitEntrySource): SpecialUnitExitLabel {
  return specialUnitExitLabelBySource[source];
}
