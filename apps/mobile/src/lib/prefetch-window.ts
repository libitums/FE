// 배경 미리 받기 창(ADR-0157) — 그림 · 음성을 미리 받아 두는 편은 「진행 중인 편 + 다음 `PREFETCH_WINDOW_AHEAD`편」뿐입니다.
// 본문(텍스트)은 창과 상관없이 모두 받습니다. 창 밖 편은 사용자가 열 때(`openEpisodeForPrefetch`) 받습니다.
// 창은 진행에서 파생해 세션 동안 여기 둡니다(받기 차례가 읽음). 저장하지 않습니다 — 다음 실행에 진행에서 다시 셉니다.

/** 진행 중인 편 뒤로 미리 받는 편 수입니다. 바꾸면 창이 넓어지거나 좁아집니다. */
export const PREFETCH_WINDOW_AHEAD = 1;

/** 맵 순서 `order`에서 첫 미완료 편(없으면 마지막 편)부터 `1 + ahead`편입니다. 순수. */
export function prefetchWindowIds(
  order: readonly string[],
  isComplete: (episodeId: string) => boolean,
  ahead: number = PREFETCH_WINDOW_AHEAD,
): readonly string[] {
  if (order.length === 0) return [];
  const first = order.findIndex((id) => !isComplete(id));
  const start = first === -1 ? order.length - 1 : first;
  return order.slice(start, start + 1 + ahead);
}

let windowIds: readonly string[] | null = null;
const opened = new Set<string>();

/** 진행에서 센 창을 둡니다. 창이 바뀌었으면 참 — 부르는 쪽이 받기 차례를 다시 돌립니다. */
export function setPrefetchWindow(ids: readonly string[]): boolean {
  const same =
    windowIds !== null &&
    windowIds.length === ids.length &&
    windowIds.every((id, i) => id === ids[i]);
  if (same) return false;
  windowIds = [...ids];
  return true;
}

/** 이번 실행에 사용자가 연 창 밖 편 — 받기를 허락합니다. 새로 더했으면 참. */
export function openEpisodeForPrefetch(episodeId: string): boolean {
  if (episodeId === "" || opened.has(episodeId) || windowIds?.includes(episodeId)) return false;
  opened.add(episodeId);
  return true;
}

/** 받기 차례가 쓰는 창입니다. 진행을 아직 모르면 `defaultOrder`의 앞 편(새 사용자 창)입니다. */
export function prefetchWindowOf(defaultOrder: readonly string[]): ReadonlySet<string> {
  const base = windowIds ?? prefetchWindowIds(defaultOrder, () => false);
  return new Set([...base, ...opened]);
}

/** 테스트 전용: 세션 상태를 처음으로. */
export function resetPrefetchWindowForTests(): void {
  windowIds = null;
  opened.clear();
}
