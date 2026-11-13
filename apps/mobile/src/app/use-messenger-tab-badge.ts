// 하단 탭 메신저의 NEW 배지(사용자 결정 2026-11-13) — 메신저 탭에 처음 들어가기 전, 또는 안 연 새 친구가 있을 때.
// 메신저 탭에 들어가면 기기에 「들어감」을 남깁니다. 손님 · 시험 계정 아님은 방을 못 열어 새 친구로는 달지 않습니다.
// 출처는 답 조각마다 바뀌므로 「새 친구가 있나」 불값만 골라 그 값이 바뀔 때만 다시 그립니다(세션 루트 전체가 다시 그려지지 않게).

import { useEffect, useState } from "@lynx-js/react";

import {
  hasNewFriend,
  markMessengerTabVisited,
  messengerTabBadge,
  messengerTabVisited,
} from "../screens/messenger-chat/messenger-guide";
import { messengerAccessFor } from "./render-messenger-chat";
import type { Tab } from "./navigation";
import type { ScreenWiring } from "./screen-wiring";

export function useMessengerTabBadge(wiring: ScreenWiring, tab: Tab): Partial<Record<Tab, "new">> {
  const source = wiring.messengerChat.source;
  const access = messengerAccessFor(wiring);
  const [newFriend, setNewFriend] = useState(() => hasNewFriend(source.snapshot().rooms, access));
  useEffect(() => {
    const read = () => setNewFriend(hasNewFriend(source.snapshot().rooms, access));
    read();
    return source.subscribe(read);
  }, [source, access]);
  const [visited, setVisited] = useState(messengerTabVisited);
  useEffect(() => {
    if (tab !== "messenger" || visited) return;
    markMessengerTabVisited();
    setVisited(true);
  }, [tab, visited]);
  return messengerTabBadge({ visited, newFriend }) === "new" ? { messenger: "new" } : {};
}
