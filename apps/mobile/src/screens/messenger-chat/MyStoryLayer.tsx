import { useGlobalProps } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { safeAreaInsetsFrom, sheetBottomInsetFrom } from "../../lib/safe-area";
import { playSound } from "../../lib/sound-effects";
import { useLayerBack } from "../../lib/use-back-handler";

import "./my-stories.css";

/** 아래 단추 줄의 기본 여백(CSS `--libitum-spacing-16`). */
const FOOTER_PADDING = 16;

/** 머리 줄의 둥근 아이콘 단추(48) — 닫기 · 메뉴. */
export function MyStoryIconButton({
  testId,
  icon,
  label,
  onTap,
}: {
  readonly testId: string;
  readonly icon: string;
  readonly label: string;
  readonly onTap: () => void;
}): ReactNode {
  function handleTap() {
    "background only";
    playSound("button");
    onTap();
  }
  return (
    <view
      className="my-story-icon-button"
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      flatten={false}
      bindtap={handleTap}
    >
      <svg className="my-story-icon" content={icon} current-color={color.fg["neutral-muted"]} />
    </view>
  );
}

/**
 * 내 스토리의 전체 화면 층(ADR-0179) — 만들기 · 내 스토리 보기. 목록 위 고정 층이라 앱 셸의 안전 영역 여백을 받지 못해 위 · 아래 인셋을
 * 직접 읽습니다(SA-FIX1). 시스템 뒤로 = 닫기. 머리 줄 오른쪽(`trailing`) · 아래 단추 줄(`footer`)은 넣는 쪽이 정합니다.
 */
export function MyStoryLayer({
  testId,
  title,
  closeTestId,
  closeLabel,
  onClose,
  trailing,
  footer,
  children,
  hidden = false,
}: {
  readonly testId: string;
  readonly title: string;
  readonly closeTestId: string;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly trailing?: ReactNode;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  /** 위에 확인 상자가 떠 있으면 낭독에서 가립니다. */
  readonly hidden?: boolean;
}): ReactNode {
  const globalProps = useGlobalProps();
  const insets = safeAreaInsetsFrom(globalProps);
  const bottom = sheetBottomInsetFrom(globalProps, FOOTER_PADDING);
  useLayerBack(onClose);
  return (
    <view
      className="my-story-layer"
      data-testid={testId}
      event-through={false}
      accessibility-elements-hidden={hidden}
      style={{ paddingTop: `${insets.top}px` }}
    >
      <view className="my-story-head">
        <MyStoryIconButton testId={closeTestId} icon={cross} label={closeLabel} onTap={onClose} />
        <text className="my-story-title" accessibility-traits="header" flatten={false}>
          {title}
        </text>
        {trailing ?? null}
      </view>
      <scroll-view
        className="my-story-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="my-story-body">{children}</view>
      </scroll-view>
      {footer === undefined ? null : (
        <view className="my-story-footer" style={{ paddingBottom: `${FOOTER_PADDING + bottom}px` }}>
          {footer}
        </view>
      )}
    </view>
  );
}
