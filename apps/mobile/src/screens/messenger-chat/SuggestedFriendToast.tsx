import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import { Avatar } from "@libitums/ui-lynx/avatar";

import { announce } from "../../lib/accessibility";
import { LIST_NOTICE_MS } from "./messenger-list-notice";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";

import "./suggested-friends.css";

export type SuggestedFriendToastValue = {
  /** 같은 글이 또 와도 3초를 새로 세도록 매번 다른 값입니다. */
  readonly key: number;
  readonly text: string;
  readonly name: string;
  readonly avatarUrl: string | null;
};

/**
 * 「<이름> added to your chats」 3초 토스트(R3, ADR-0162) — 목록 안내 줄(ADR-0127)과 같은 자리 · 시간입니다. 뜰 때 한 번 낭독하고,
 * 탭을 막지 않습니다. 타이머는 감싸서 풉니다(Lynx `clearTimeout`은 인자 하나).
 */
export function SuggestedFriendToast({
  value,
}: {
  readonly value: SuggestedFriendToastValue | null;
}): ReactNode {
  const [shown, setShown] = useState<SuggestedFriendToastValue | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === null) return;
    setShown(value);
    announce(value.text);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setShown(null);
    }, LIST_NOTICE_MS);
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  if (shown === null) return null;
  return (
    <view
      className="suggested-toast"
      data-testid={ids.toast}
      flatten={false}
      user-interaction-enabled={false}
      accessibility-element={true}
      accessibility-label={shown.text}
    >
      <Avatar
        imageSource={shown.avatarUrl ?? undefined}
        name={shown.name}
        size="xs"
        accessibility="hidden"
      />
      <text className="suggested-toast-text" accessibility-element={false}>
        {shown.text}
      </text>
    </view>
  );
}
