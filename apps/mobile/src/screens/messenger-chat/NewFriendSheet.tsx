import { useGlobalProps, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Avatar } from "@libitums/ui-lynx/avatar";
import { shouldDismissBottomSheetDrag } from "@libitums/ui-lynx/bottom-sheet";
import { Button } from "@libitums/ui-lynx/button";
import { Overlay } from "@libitums/ui-lynx/overlay";

import { ChatTextBubble } from "../../components/chat/ChatMessageRow";
import { screenHeightFrom } from "../../lib/learning-density";
import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { useUiCopy } from "../../lib/ui-copy";
import { newFriendTestIds as ids } from "./new-friend.contract";
import type { NewFriendSheetProps } from "./new-friend.contract";
import { replyButtonStateOf } from "./new-friend";
import { sheetMaxHeightOf } from "./scroll-budget";
import { useScrollBudget } from "./use-scroll-budget";

import "../../components/chat/chat.css";
import "./new-friend.css";

/** 이 높이(pt) 미만이면 작은 판입니다(띠 128 · 얼굴 96). 높이를 모르면 작은 쪽이 안전합니다. */
const COMPACT_BELOW_HEIGHT = 700;

const FIXED_KEYS = ["top", "actions"] as const;

type PanelTouchEvent = { readonly detail: { readonly y: number } };

// 스크롤 중인 본문 위에서 시작한 터치가 판 끌어내림(dismiss)으로 번지지 않게 막습니다. 스크롤 자체는 네이티브가 처리합니다.
function holdTouch(): void {
  "background only";
}

function isCompactScreen(): boolean {
  const height = screenHeightFrom(typeof SystemInfo === "undefined" ? undefined : SystemInfo);
  return !(height >= COMPACT_BELOW_HEIGHT);
}

/**
 * 새 친구 시트(E2) 그리기입니다. 단계(typing · message)와 시간표는 층이 정하고, 이 컴포넌트는 받은 값을 그립니다.
 * 막 탭 · Later · 판 끌어내림은 모두 `onLater`입니다.
 */
export function NewFriendSheet({
  model,
  phase,
  timeline,
  onReply,
  onLater,
}: NewFriendSheetProps): ReactNode {
  const copy = useUiCopy().messengerChat;
  const dragStartY = useRef<number | null>(null);
  const compact = isCompactScreen();
  const still = timeline.face === "still";
  const replyState = replyButtonStateOf(phase);
  // 큰 글자에서 판이 화면 밖으로 넘치지 않게 px 상한을 걸고, 본문만 스크롤합니다(접근성 C1). 띠 · 얼굴 · 단추 줄은 고정입니다.
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const maxHeight = sheetMaxHeightOf({
    screenHeight: screenHeightFrom(typeof SystemInfo === "undefined" ? undefined : SystemInfo),
    insetTop: insets.top,
  });
  const budget = useScrollBudget(maxHeight, FIXED_KEYS);

  const handleDragStart = (event: PanelTouchEvent): void => {
    "background only";
    // 제스처 안에서만 쓰는 시작 y입니다 — 네이티브 터치 콜백 둘 사이를 잇습니다.
    // oxlint-disable-next-line react/immutability
    dragStartY.current = event.detail.y;
  };
  const handleDragEnd = (event: PanelTouchEvent): void => {
    "background only";
    const startY = dragStartY.current;
    // oxlint-disable-next-line react/immutability
    dragStartY.current = null;
    if (startY !== null && shouldDismissBottomSheetDrag(startY, event.detail.y)) onLater();
  };
  const handleReply = (): void => {
    "background only";
    onReply();
  };
  const handleLater = (): void => {
    "background only";
    onLater();
  };

  return (
    <view
      className={compact ? "new-friend new-friend-compact" : "new-friend"}
      data-testid={ids.sheet}
      data-phase={phase}
      event-through={false}
    >
      <Overlay scope="screen" surface="sheet" dismiss="tap" binddismiss={onLater} />
      <view
        className={still ? "new-friend-panel new-friend-panel-still" : "new-friend-panel"}
        data-testid={ids.panel}
        style={maxHeight === null ? undefined : { maxHeight: `${maxHeight}px` }}
        bindtouchstart={handleDragStart}
        bindtouchend={handleDragEnd}
      >
        <view
          className="new-friend-top"
          data-testid={ids.top}
          bindlayoutchange={budget.onFixedLayout("top")}
        >
          <view className="new-friend-band" data-testid={ids.band}>
            {model.sceneUrl === null ? null : (
              <image
                className="new-friend-band-image"
                src={model.sceneUrl}
                mode="aspectFill"
                accessibility-elements-hidden={true}
              />
            )}
            <view className="new-friend-band-shade" />
            <view className="new-friend-band-fade" />
            <view className="new-friend-handle" accessibility-elements-hidden={true} />
            <view
              className="new-friend-chip"
              data-testid={ids.chip}
              accessibility-elements-hidden={true}
            >
              <view className="new-friend-chip-surface" />
              <text className="new-friend-chip-text">
                {copy.newFriend.episodeChip(model.episodeOrdinal)}
              </text>
            </view>
          </view>

          <view className="new-friend-face-row">
            <view
              className={`new-friend-face ${still ? "new-friend-face-still" : "new-friend-face-bounce"}`}
              data-testid={ids.face}
              data-motion={timeline.face}
              accessibility-elements-hidden={true}
            >
              {model.faceUrl === null ? (
                <view className="new-friend-face-initial">
                  <Avatar name={model.name} size="xl" accessibility="hidden" />
                </view>
              ) : (
                <image
                  className="new-friend-face-image"
                  src={model.faceUrl}
                  mode="aspectFill"
                  accessibility-elements-hidden={true}
                />
              )}
            </view>
          </view>
        </view>

        <scroll-view
          className="new-friend-scroll"
          data-testid={ids.scroll}
          scroll-orientation="vertical"
          scroll-bar-enable={false}
          style={budget.height === null ? undefined : { height: `${budget.height}px` }}
          catchtouchstart={budget.scrollable ? holdTouch : undefined}
          catchtouchend={budget.scrollable ? holdTouch : undefined}
        >
          <view
            className="new-friend-body"
            data-testid={ids.scrollContent}
            bindlayoutchange={budget.onContentLayout}
          >
            <view
              className="new-friend-title"
              id={ids.title}
              data-testid={ids.title}
              accessibility-element={true}
              accessibility-traits="header"
              accessibility-role-description="dialog"
              accessibility-label={copy.newFriend.sheetLabel(model.name)}
            >
              <text className="new-friend-eyebrow" accessibility-elements-hidden={true}>
                {copy.newFriend.newFriend}
              </text>
              <text
                className="new-friend-name"
                data-testid={ids.name}
                accessibility-elements-hidden={true}
              >
                {model.name}
              </text>
            </view>
            <text className="new-friend-met" data-testid={ids.met}>
              {copy.newFriend.metIn(model.episodeOrdinal, model.episodeTitle)}
            </text>

            <view className="new-friend-slot">
              {phase === "typing" ? (
                <view
                  className="new-friend-typing"
                  data-testid={ids.typing}
                  accessibility-element={true}
                  accessibility-label={copy.list.typing(model.name)}
                >
                  <view
                    className={`chat-typing${timeline.dots === "still" ? " chat-typing-still" : ""}`}
                  >
                    <view className="chat-dot" />
                    <view className="chat-dot chat-dot-2" />
                    <view className="chat-dot chat-dot-3" />
                  </view>
                  <text className="new-friend-typing-label" accessibility-elements-hidden={true}>
                    {copy.list.typing(model.name)}
                  </text>
                </view>
              ) : (
                <view
                  className={
                    still ? "new-friend-message new-friend-message-still" : "new-friend-message"
                  }
                  data-testid={ids.message}
                >
                  <ChatTextBubble
                    direction="incoming"
                    speaker={model.name}
                    message={model.opening.ko}
                    translation={model.opening.en}
                  />
                </view>
              )}
            </view>
          </view>
        </scroll-view>

        <view
          className="new-friend-actions"
          data-testid={ids.actions}
          bindlayoutchange={budget.onFixedLayout("actions")}
        >
          <view
            className={
              replyState === "dim"
                ? "new-friend-reply new-friend-reply-waiting"
                : "new-friend-reply"
            }
            data-testid={ids.reply}
            data-state={replyState}
          >
            <Button
              label={copy.newFriend.reply}
              variant="brand"
              size="xl"
              width="fill"
              bindtap={handleReply}
            />
          </view>
          <view className="new-friend-later" data-testid={ids.later}>
            <Button
              label={copy.newFriend.later}
              variant="text"
              size="l"
              width="fill"
              bindtap={handleLater}
            />
          </view>
        </view>
      </view>
    </view>
  );
}
