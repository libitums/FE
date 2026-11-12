import type { ReactNode } from "@lynx-js/react";

import type { ChatHeaderProps, ChatHeaderSideProps } from "./chat.contract";

import "./chat.css";

// 흰 바 머리입니다 — 앞 칸 · 가운데 제목(선택 부제 한 줄) · 뒤 칸. 뒤 칸이 없으면(end null) 빈 옆 칸이 제목을 가운데에 둡니다.
export function ChatHeader({
  title,
  insetTop,
  testIds,
  start,
  end,
  subtitle,
}: ChatHeaderProps): ReactNode {
  // 부제가 있으면 제목은 한 줄로 자릅니다(`text-maxline` + 말줄임) — 가장 큰 글자에서 제목 · 부제가 네 줄이 되어 화면 40%를 먹었습니다(기기 F3).
  // 묶음 안 제목은 `flex: 1`(basis 0)을 쓰지 않습니다 — 세로 묶음에서 높이 0으로 접혀 부제와 겹쳤습니다(기기 F1).
  const titleClass = subtitle === undefined ? "chat-title" : "chat-title chat-title-stacked";
  const titleText = (
    <text
      className={titleClass}
      data-testid={testIds.title}
      // Android는 접근성 요소로 세우지 않은 글을 납작하게 펴 트리에서 지웁니다 — 화면 제목이 읽히게 세웁니다(ADR-0126 기기 확인).
      flatten={false}
      accessibility-element={true}
      accessibility-traits="header"
      text-maxline={subtitle === undefined ? undefined : "1"}
    >
      {title}
    </text>
  );
  return (
    <view
      className="chat-header"
      data-testid={testIds.root}
      style={{ paddingTop: `${insetTop}px` }}
    >
      <view className="chat-header-row">
        {start}
        {subtitle === undefined ? (
          titleText
        ) : (
          <view className="chat-title-stack">
            {titleText}
            {subtitle}
          </view>
        )}
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
