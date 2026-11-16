import type { ReactNode } from "@lynx-js/react";

import { SettingsCell } from "@libitums/ui-lynx/settings-cell";

export type NavRowProps = {
  readonly testId: string;
  readonly title: string;
  /** 설명 줄(값) — 없으면 제목만. */
  readonly value?: string;
  readonly onTap: () => void;
  /** 감싸개 클래스 — Chats 화면 `chat-settings-row`(기본) · 사이드바 `chat-sidebar-row`. */
  readonly className?: string;
  /** 사이드바의 줄 순서(data-order). */
  readonly order?: number;
};

// 누르면 시트 · 화면이 열리는 줄입니다. 낭독은 「제목, 값」 하나이고 Android 접근성 트리에 남깁니다(ADR-0125). `id`로 초점을
// 돌려받습니다. 안쪽 칸은 모양만 맡아 낭독에서 숨습니다.
export function NavRow({
  testId,
  title,
  value,
  onTap,
  className = "chat-settings-row",
  order,
}: NavRowProps): ReactNode {
  return (
    <view
      className={className}
      id={testId}
      data-testid={testId}
      {...(order === undefined ? {} : { "data-order": String(order) })}
      flatten={false}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={value === undefined ? title : `${title}, ${value}`}
      accessibility-enable-tap={true}
      bindtap={() => {
        "background only";
        onTap();
      }}
    >
      <view accessibility-elements-hidden={true}>
        <SettingsCell
          trailing="navigation"
          title={title}
          description={value}
          onNavigate={() => {}}
        />
      </view>
    </view>
  );
}
