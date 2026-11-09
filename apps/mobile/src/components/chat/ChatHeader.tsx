import type { ReactNode } from "@lynx-js/react";

import type { ChatHeaderProps, ChatHeaderSideProps } from "./chat.contract";

import "./chat.css";

// 흰 바 머리입니다 — 앞 칸 · 가운데 제목 · 뒤 칸. 뒤 칸이 없으면(end null) 빈 옆 칸이 제목을 가운데에 둡니다.
export function ChatHeader({ title, insetTop, testIds, start, end }: ChatHeaderProps): ReactNode {
  return (
    <view
      className="chat-header"
      data-testid={testIds.root}
      style={{ paddingTop: `${insetTop}px` }}
    >
      <view className="chat-header-row">
        {start}
        <text className="chat-title" data-testid={testIds.title} accessibility-traits="header">
          {title}
        </text>
        {end ?? <ChatHeaderSide />}
      </view>
    </view>
  );
}

export function ChatHeaderSide({
  testId,
  id,
  accessibilityLabel,
  onTap,
  children,
}: ChatHeaderSideProps): ReactNode {
  if (accessibilityLabel === undefined) {
    return (
      <view className="chat-header-side" data-testid={testId}>
        {children}
      </view>
    );
  }
  // 이 칸이 접근성 요소 하나(버튼)입니다 — 탭은 안쪽 단추에서 올라와 여기서 처리하고, 안쪽 그림은 낭독에서 숨깁니다.
  return (
    <view
      className="chat-header-side"
      id={id}
      data-testid={testId}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={accessibilityLabel}
      accessibility-enable-tap={true}
      bindtap={() => {
        "background only";
        onTap?.();
      }}
    >
      <view accessibility-elements-hidden={true}>{children}</view>
    </view>
  );
}
