import { useGlobalProps, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import shield from "@libitums/icons/lynx/shield";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { Avatar } from "@libitums/ui-lynx/avatar";
import { shouldDismissBottomSheetDrag } from "@libitums/ui-lynx/bottom-sheet";
import { Button } from "@libitums/ui-lynx/button";
import { useMotion } from "@libitums/ui-lynx/motion";
import { Overlay } from "@libitums/ui-lynx/overlay";

import { screenHeightFrom } from "../../lib/learning-density";
import { safeAreaInsetsFrom, sheetBottomInsetFrom } from "../../lib/safe-area";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import type { AdultAckSheetProps } from "./suggested-friends.contract";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import { sheetMaxHeightOf } from "./scroll-budget";

import "./suggested-friends.css";
import "./suggested-sheet.css";

/** 단추 줄의 기본 아래 여백(CSS `--libitum-spacing-16`)입니다. */
const ACTIONS_BOTTOM_PADDING = 16;

type PanelTouchEvent = { readonly detail: { readonly y: number } };

/**
 * 「Get closer」 시트(ADR-0164 D4, 디자인 B1 SoftSheet — 사용자 결정 2026-11-19). 프로필 시트와 같은 판(`suggested-sheet`) 위에 얼굴 ·
 * 제목 · 본문 · 회색 안내 두 줄 · Sounds good · Just friends for now. 막 탭 · 끌어내림 · 시스템 뒤로가기는 닫기만(`onClose`)입니다.
 * 문구는 어느 언어에서도 로맨스 · 성인 · 18+ · 생년을 말하지 않습니다(문구표 `suggested.adultAck`).
 */
export function AdultAckSheet({
  name,
  avatarUrl,
  gender,
  onConfirm,
  onDecline,
  onClose,
}: AdultAckSheetProps): ReactNode {
  const copy = useUiCopy().messengerChat.suggested.adultAck;
  const still = useMotion() === "reduced";
  const dragStartY = useRef<number | null>(null);
  const globalProps = useGlobalProps();
  // 판이 위 안전 영역(상태 표시줄 · 노치)까지 올라가지 않게 px 상한을 겁니다(프로필 시트와 같음).
  const maxHeight = sheetMaxHeightOf({
    screenHeight: screenHeightFrom(typeof SystemInfo === "undefined" ? undefined : SystemInfo),
    insetTop: safeAreaInsetsFrom(globalProps).top,
  });
  // 아래 시스템 바 · 홈 인디케이터 몫(ADR-0044 D3 개정) — CSS `env()`는 Lynx에서 0입니다.
  const bottomInset = sheetBottomInsetFrom(globalProps, ACTIONS_BOTTOM_PADDING);
  useLayerBack(onClose);

  const handleDragStart = (event: PanelTouchEvent): void => {
    "background only";
    // oxlint-disable-next-line react/immutability
    dragStartY.current = event.detail.y;
  };
  const handleDragEnd = (event: PanelTouchEvent): void => {
    "background only";
    const startY = dragStartY.current;
    // oxlint-disable-next-line react/immutability
    dragStartY.current = null;
    if (startY !== null && shouldDismissBottomSheetDrag(startY, event.detail.y)) onClose();
  };

  const rows = [
    { key: "safe", icon: shield, tint: color.feedback["correct-text"], text: copy.safe },
    { key: "casual", icon: tick, tint: color.fg["neutral-muted"], text: copy.casual(gender) },
  ];

  return (
    <view className="suggested-sheet" data-testid={ids.adultAck} event-through={false}>
      <Overlay scope="screen" surface="sheet" dismiss="tap" binddismiss={onClose} />
      <view
        className={
          still ? "suggested-sheet-panel suggested-sheet-panel-still" : "suggested-sheet-panel"
        }
        style={maxHeight === null ? undefined : { maxHeight: `${maxHeight}px` }}
        bindtouchstart={handleDragStart}
        bindtouchend={handleDragEnd}
      >
        <view className="suggested-sheet-top">
          <view className="suggested-sheet-handle" accessibility-elements-hidden={true} />
          <view className="suggested-sheet-face" accessibility-elements-hidden={true}>
            <Avatar
              imageSource={avatarUrl ?? undefined}
              name={name}
              size="lg"
              accessibility="hidden"
            />
          </view>
          <text
            className="suggested-sheet-name adult-ack-title"
            flatten={false}
            accessibility-element={true}
            accessibility-traits="header"
            accessibility-role-description="dialog"
          >
            {copy.title(name)}
          </text>
          <text className="suggested-sheet-sub" flatten={false} accessibility-element={true}>
            {copy.body(gender)}
          </text>
        </view>

        <view className="suggested-sheet-body">
          <view className="adult-ack-info">
            {rows.map((row) => (
              <view
                key={row.key}
                className="adult-ack-row"
                flatten={false}
                accessibility-element={true}
                accessibility-label={row.text}
              >
                <svg className="adult-ack-icon" content={row.icon} current-color={row.tint} />
                <text className="adult-ack-row-text">{row.text}</text>
              </view>
            ))}
          </view>
        </view>

        <view
          className="suggested-sheet-actions"
          style={
            bottomInset > 0
              ? { paddingBottom: `${ACTIONS_BOTTOM_PADDING + bottomInset}px` }
              : undefined
          }
        >
          <view data-testid={ids.adultAckConfirm}>
            <Button
              label={copy.confirm}
              variant="brand"
              size="xl"
              width="fill"
              bindtap={onConfirm}
            />
          </view>
          <view data-testid={ids.adultAckDecline}>
            <Button label={copy.decline} variant="text" size="l" width="fill" bindtap={onDecline} />
          </view>
        </view>
      </view>
    </view>
  );
}
