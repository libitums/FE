// 특별 유닛 진입 출처 어휘의 정본입니다.
//
// `lib/`인 근거는 이 어휘를 화면 계약(`LessonCompleteScreen`의 `exitTo`)과 문구표 계약
// (`common.exitTo`의 키)이 함께 쓴다는 것입니다 — 어느 한 화면의 것이 아니고, 타입
// 이름이 가리키는 화면이 없습니다(`docs/conventions/code.md` 「import」의 승격 조건).
//
// **타입 하나짜리 모듈입니다.** 라벨은 화면이 `copy.common.exitTo[source]`로 직접
// 읽으므로 값 export가 없고, 이 모듈에는 `*.unit.test.ts`가 붙지 않습니다.

export type SpecialUnitEntrySource = "journey" | "roleplay";
