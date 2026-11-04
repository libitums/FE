// 모두 끝낸 뒤 시트를 띄울 때를 정하는 순수 단계 함수입니다(ADR-0095 D9). 마지막 편을 「끝낸 순간」을 기억했다가
// 맵 루트에 서면 한 번 판정합니다 — 오래 확인 못 했거나 오프라인이면 띄웁니다. 앱을 켤 때 이미 다 끝낸 상태는
// 「끝낸 순간」이 아니라 세지 않습니다(앱을 켤 때마다 뜨지 않음).

export type AllClearedNoticeState = {
  /** 직전 판정의 「다 끝냄」. 진행을 다 읽기 전에는 `null`(기준이 아직 없음). */
  readonly previousCleared: boolean | null;
  readonly pending: boolean;
};

export type AllClearedNoticeInput = {
  /** 진행을 다 읽었는가 — 읽는 동안의 거짓 → 참을 끝낸 순간으로 세지 않습니다. */
  readonly loaded: boolean;
  readonly allCleared: boolean;
  readonly atMapRoot: boolean;
  readonly stale: boolean;
  readonly offline: boolean;
};

export function allClearedNoticeStep(
  state: AllClearedNoticeState,
  input: AllClearedNoticeInput,
): { readonly state: AllClearedNoticeState; readonly show: boolean } {
  if (!input.loaded) return { state: { previousCleared: null, pending: false }, show: false };
  if (state.previousCleared === null) {
    return { state: { previousCleared: input.allCleared, pending: false }, show: false };
  }
  // 다 끝낸 상태가 풀리면(새 편이 들어옴) 기억도 지웁니다.
  const pending = input.allCleared && (state.pending || !state.previousCleared);
  if (!pending || !input.atMapRoot) {
    return { state: { previousCleared: input.allCleared, pending }, show: false };
  }
  return {
    state: { previousCleared: input.allCleared, pending: false },
    show: input.stale || input.offline,
  };
}
