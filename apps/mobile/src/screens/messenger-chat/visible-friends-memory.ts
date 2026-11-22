// 보이는 추천 친구(ADR-0164 D2)의 실행 중 기억입니다. 순수 — 계정 열쇠마다 마지막으로 읽은 목록 하나만 둡니다. 목록 화면은 탭을
// 떠나면 내려가므로, 다시 설 때 이 값으로 첫 프레임을 그려 새 친구가 늦게 끼며 줄이 바뀌지 않게 합니다.

import type { VisibleFriend } from "./friend-catalog.contract";

export type VisibleFriendsMemory = {
  /** 그 계정에서 마지막으로 읽은 목록 — 읽은 적이 없으면 null. */
  readonly recall: (key: string) => readonly VisibleFriend[] | null;
  /** 읽은 목록을 기억합니다. 못 읽음(null)은 앞 값을 지우지 않습니다. */
  readonly remember: (key: string, list: readonly VisibleFriend[] | null) => void;
};

export function createVisibleFriendsMemory(): VisibleFriendsMemory {
  const lists = new Map<string, readonly VisibleFriend[]>();
  return {
    recall: (key) => lists.get(key) ?? null,
    remember: (key, list) => {
      if (list !== null) lists.set(key, list);
    },
  };
}
