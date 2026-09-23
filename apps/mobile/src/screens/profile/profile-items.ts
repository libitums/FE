// 프로필 화면의 임시 입력값 자리입니다(「임시 입력값의 이음매」 —
// docs/conventions/code.md).

import type { ProfileItem } from "./profile.contract";

// **무엇이 임시인가** — 아래 셋의 `value`뿐입니다(그리고 이 표 전체가 값의
// 이음매입니다). `id`·`label`과 항목이 셋이라는 것은 임시가 아닙니다.
//
// **무엇이 임시가 아닌가** — `ProfileItem`의 필드 셋(`id`·`label`·`value`)과 셋
// 다 입력값이라는 라벨 축입니다. 파생값(연속 학습일 · 완료 스텝 수 · 진행률 ·
// 클리어 수)은 이 표에 자리가 없습니다 — 넣으면 `TS2353`이 납니다.
//
// **무엇이 막고 있나** — 진짜 값은 계정과 온보딩에서 옵니다. 둘 다 범위 밖이라
// 여기서는 자리표(placeholder) 값을 대신 채웁니다.
//
// **진짜가 오는 날 무엇만 바뀌나** — 이 표의 `value` 셋뿐입니다. 형태도 export
// 목록도 화면도 결선도 안 바뀝니다.
const profileItemTable: readonly ProfileItem[] = [
  { id: "name", label: "이름", value: "두루 학습자" },
  { id: "learning-language", label: "학습 언어", value: "한국어" },
  { id: "learning-goal", label: "학습 목표", value: "일상 대화" },
];

export function profileItems(): readonly ProfileItem[] {
  return profileItemTable;
}
