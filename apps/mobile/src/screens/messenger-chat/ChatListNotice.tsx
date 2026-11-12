import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";
import { useUiCopy } from "../../lib/ui-copy";
import { LIST_NOTICE_MS, type ChatListNoticeProps } from "./messenger-list-notice";

import "./messenger-list.css";

// 메신저 목록 아래 3초 상태 줄입니다(ADR-0127). 받자마자 `onNoticeShown`으로 route에서 지우고, 보이는 동안은 이 컴포넌트가
// 들고 있습니다 — 방에 다녀와 목록이 다시 그려져도 또 뜨지 않게요.
export function ChatListNotice({ notice, onNoticeShown }: ChatListNoticeProps): ReactNode {
  const text = useUiCopy().messengerChat.pushNotice.chatUnavailable;
  const [shown, setShown] = useState(notice !== null);
  const shownRef = useRef(onNoticeShown);
  shownRef.current = onNoticeShown;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 안내가 올 때마다 3초를 새로 셉니다 — 떠 있는 동안 또 와도 온전히 3초(PR #414 리뷰).
  useEffect(() => {
    if (notice === null) return;
    setShown(true);
    shownRef.current();
    announce(text);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setShown(false);
    }, LIST_NOTICE_MS);
  }, [notice, text]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  if (!shown) return null;
  return (
    // 접근성 요소로 세워 탐색으로도 찾게 합니다(뜰 때 announce 한 번과 별개 — ADR-0127 리뷰 W4).
    <view
      className="messenger-list-notice"
      data-testid="chat-list-notice"
      flatten={false}
      user-interaction-enabled={false}
      accessibility-element={true}
      accessibility-label={text}
    >
      <text className="messenger-list-notice-text" accessibility-element={false}>
        {text}
      </text>
    </view>
  );
}
