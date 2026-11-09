import { useEffect, useMainThreadRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import type { MainThread } from "@lynx-js/types";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";

import type { ChatLogProps } from "./chat.contract";

import "./chat.css";

let logSequence = 0;

function nextLogId(): string {
  logSequence += 1;
  return `chat-log-${logSequence}`;
}

// 다음 프레임에 대화 끝으로 내립니다(백그라운드). 못 옮기면 조용히 둡니다.
function scrollToEnd(id: string, smooth: boolean): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${id}`)
      .invoke({ method: "scrollTo", params: { offset: 1_000_000, smooth } })
      .exec();
  } catch {
    // 테스트 환경 · 요소 없음 — 끝 맞춤은 부가 동작입니다.
  }
}

// 대화 로그입니다 — 말풍선이 늘 때마다(내용 높이) 화면 쪽 스레드에서, followKey가 바뀔 때는 다음 프레임에 끝으로 내립니다.
export function ChatLog({ testId, followKey, children }: ChatLogProps): ReactNode {
  const logRef = useMainThreadRef<MainThread.Element>(null);
  const [id] = useState(nextLogId);
  // 움직임 줄이기에서는 부드러운 스크롤이 아니라 점프로 끝에 닿습니다(design 9절 · 접근성 M6).
  const smooth = !resolveReducedMotion(undefined, useMotion());

  const followEnd = (event: { detail: { scrollHeight: number } }) => {
    "main thread";
    void logRef.current?.invoke("scrollTo", { offset: event.detail.scrollHeight, smooth });
  };

  useEffect(() => {
    if (followKey === undefined) return;
    const handle = setTimeout(() => scrollToEnd(id, smooth), 16);
    return () => clearTimeout(handle);
  }, [followKey, id, smooth]);

  return (
    <scroll-view
      id={id}
      className="chat-log"
      data-testid={testId}
      scroll-orientation="vertical"
      scroll-bar-enable={false}
      main-thread:ref={logRef}
      main-thread:bindcontentsizechanged={followEnd}
    >
      <view className="chat-log-inner">{children}</view>
    </scroll-view>
  );
}
