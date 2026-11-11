// 막 해금했지만 아직 시트를 보이지 않은 인물입니다(messenger-chat-1-5 spec §7.1) — 앱이 떠 있는 동안만 기억합니다(기기에 적지
// 않습니다. 해금 자체는 `commitNewFriend`가 이미 저장했습니다). 이야기 화면이 위에 있는 동안 맵은 내려가 있다가 돌아오면 다시
// 서므로, 맵의 시트 자리가 마운트 때 한 번 꺼내 씁니다. `journey-map-cleared-memory.ts`와 같은 꼴입니다.

let remembered: string | null = null;

/** 해금을 확정한 자리에서 부릅니다 — 나중 기억이 앞 기억을 덮습니다. */
export function rememberNewFriend(characterId: string): void {
  remembered = characterId;
}

/** 기억한 인물 id를 돌려주고 비웁니다. 없으면 null. */
export function takeNewFriend(): string | null {
  const taken = remembered;
  remembered = null;
  return taken;
}

/** 테스트 · 세션 초기화용입니다. */
export function forgetNewFriend(): void {
  remembered = null;
}
