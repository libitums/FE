// 대화 출처 구독 훅입니다(messenger-chat-ui spec §3.2). 마운트 때 구독하고 해제는 정리 함수가 합니다.
// 출처가 같은 상태에는 같은 참조를 돌려주므로(계약), 값이 같으면 다시 그리지 않습니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import type { ChatSnapshot, ChatSource, ChatThread } from "./chat-source.contract";

// 렌더 때마다 출처에서 읽어 늘 최신입니다(알림 없이 그림 주소만 바뀐 경우도 다시 그리면 반영됩니다 — D3). 구독은 참조가
// 바뀔 때만 다시 그리게 합니다.
export function useChatSnapshot(source: ChatSource): ChatSnapshot {
  const current = source.snapshot();
  const seen = useRef(current);
  seen.current = current;
  const [, setVersion] = useState(0);
  useEffect(() => {
    const check = () => {
      if (source.snapshot() !== seen.current) setVersion((version) => version + 1);
    };
    // 첫 그림과 구독 사이에 바뀐 값을 놓치지 않도록 구독 직전에 한 번 맞춥니다.
    check();
    return source.subscribe(check);
  }, [source]);
  return current;
}

// 한 방의 대화입니다. 렌더 때마다 출처에서 읽어 늘 최신이고, 구독은 그 방의 참조가 바뀔 때만 다시 그리게 합니다.
export function useChatThread(source: ChatSource, roomId: string): ChatThread | null {
  const current = source.thread(roomId);
  const seen = useRef(current);
  seen.current = current;
  const [, setVersion] = useState(0);

  useEffect(() => {
    const check = () => {
      if (source.thread(roomId) !== seen.current) setVersion((version) => version + 1);
    };
    // 렌더와 구독 사이에 바뀐 것을 놓치지 않습니다.
    check();
    return source.subscribe(check);
  }, [source, roomId]);

  return current;
}
