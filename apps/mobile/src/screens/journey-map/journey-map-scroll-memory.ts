// 여정 맵의 마지막 스크롤 자리입니다 — 앱이 떠 있는 동안만 기억합니다(기기에 적지 않습니다).
//
// 맵은 다른 화면이 서면 내려가고 돌아오면 다시 섭니다. 스택에 있던 맵으로 돌아올 때는 그 자리에서 곧바로 열고,
// 이 앱 실행에서 처음 여는 맵만 다음 유닛으로 부드럽게 내려갑니다(2026-10-20 사용자 결정).

let remembered: number | null = null;

/** 스크롤 이벤트마다 부릅니다. */
export function rememberMapScroll(scrollTop: number): void {
  remembered = Math.max(0, scrollTop);
}

/** 이 실행에서 맵을 연 적이 있으면 마지막 자리, 처음이면 `null`입니다. */
export function rememberedMapScroll(): number | null {
  return remembered;
}

/** 테스트 · 세션 초기화용입니다. */
export function forgetMapScroll(): void {
  remembered = null;
}
