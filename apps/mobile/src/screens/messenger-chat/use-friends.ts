// 추천 친구 상태 구독 훅입니다 — 출처의 친구 포트(`source.friends`)가 같은 상태에 같은 참조를 주므로 값이 같으면 다시 그리지 않습니다.
// 포트가 없으면(옛 출처 · 테스트) null입니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import type { ChatFriendsState } from "./chat-friends.contract";
import type { ChatSource } from "./chat-source.contract";

export function useFriendsState(source: ChatSource): ChatFriendsState | null {
  const current = source.friends?.state() ?? null;
  const seen = useRef(current);
  seen.current = current;
  const [, setVersion] = useState(0);
  useEffect(() => {
    const check = () => {
      if ((source.friends?.state() ?? null) !== seen.current) setVersion((version) => version + 1);
    };
    check();
    return source.subscribe(check);
  }, [source]);
  return current;
}
