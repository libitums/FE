import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import { Avatar } from "@libitums/ui-lynx/avatar";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { announce } from "../../lib/accessibility";
import { useUiCopy } from "../../lib/ui-copy";
import {
  REPLY_TOAST_MS,
  REPLY_TOAST_SWIPE_PT,
  replyToastTestIds as ids,
} from "../../app/reply-toast.contract";

import "./reply-toast.css";

export type ReplyToastView = {
  /** 바꿔 낄 때마다 새 값 — 4초를 새로 셉니다. */
  readonly key: number;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly preview: string;
  readonly more: number;
};

export type ReplyToastProps = {
  readonly view: ReplyToastView | null;
  /** 화면 위 안전 영역(pt) — 카드는 그 아래 8pt에 섭니다. */
  readonly top: number;
  readonly reducedMotion: boolean;
  readonly onOpen: () => void;
  readonly onDismiss: () => void;
};

/** 올라가는 움직임(토큰 d4)이 끝난 뒤 지웁니다. */
const LEAVE_MS = 200;
const GAP_PT = 8;

type TouchEvent = { readonly detail: { readonly y: number } };

/**
 * 답장 도착 토스트(ADR-0200 · 시안 1 ~ 4) — 화면 위에서 내려와 4초 서고 올라갑니다. 누르면 그 방, ×는 닫기만, 위로 밀면 닫힘.
 * 카드는 한 요소로 낭독하고 뜰 때(바꿔 낄 때) 한 번 알립니다. 아래 화면의 입력을 가로채지 않게 카드 밖은 비웁니다.
 * 타이머는 감싸서 풉니다(Lynx `clearTimeout`은 인자 하나).
 */
export function ReplyToast({
  view,
  top,
  reducedMotion,
  onOpen,
  onDismiss,
}: ReplyToastProps): ReactNode {
  const copy = useUiCopy().messengerChat.replyToast;
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const touchY = useRef<number | null>(null);
  const latest = useRef(onDismiss);
  latest.current = onDismiss;

  const clear = (): void => {
    for (const handle of timers.current) clearTimeout(handle);
    timers.current = [];
  };
  const leave = (): void => {
    clear();
    setLeaving(true);
    timers.current.push(setTimeout(() => latest.current(), LEAVE_MS));
  };

  const spoken = view === null ? "" : copy.spoken(view.name, view.preview, view.more);
  useEffect(() => {
    if (view === null) return;
    setLeaving(false);
    announce(spoken);
    clear();
    timers.current.push(setTimeout(leave, REPLY_TOAST_MS - LEAVE_MS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.key]);
  useEffect(() => () => clear(), []);

  if (view === null) return null;
  const motion = reducedMotion ? "reply-toast-fade" : "reply-toast-slide";
  return (
    <view
      className={`reply-toast ${motion}${leaving ? " reply-toast-leaving" : ""}`}
      data-testid={ids.card}
      flatten={false}
      style={{ top: `${top + GAP_PT}px` }}
      bindtouchstart={(event: TouchEvent) => {
        "background only";
        touchY.current = event.detail.y;
      }}
      bindtouchend={(event: TouchEvent) => {
        "background only";
        const start = touchY.current;
        touchY.current = null;
        if (start !== null && start - event.detail.y >= REPLY_TOAST_SWIPE_PT) leave();
      }}
    >
      <view
        className="reply-toast-open"
        flatten={false}
        data-testid={ids.open}
        accessibility-element={true}
        accessibility-label={spoken}
        accessibility-traits="button"
        accessibility-enable-tap={true}
        bindtap={() => {
          "background only";
          clear();
          onOpen();
        }}
      >
        <Avatar
          imageSource={view.avatarUrl ?? undefined}
          name={view.name}
          size="sm"
          accessibility="hidden"
        />
        <view className="reply-toast-text">
          <view className="reply-toast-head">
            <text className="reply-toast-name">{view.name}</text>
            {view.more > 0 ? (
              <text className="reply-toast-more" data-testid={ids.more}>
                {copy.more(view.more)}
              </text>
            ) : null}
          </view>
          <text className="reply-toast-preview" data-testid={ids.preview} text-maxline="1">
            {view.preview}
          </text>
        </view>
      </view>
      <view
        className="reply-toast-close"
        flatten={false}
        data-testid={ids.close}
        accessibility-element={true}
        accessibility-label={copy.dismiss}
        accessibility-traits="button"
        accessibility-enable-tap={true}
        bindtap={() => {
          "background only";
          clear();
          onDismiss();
        }}
      >
        <svg className="reply-toast-close-icon" content={cross} current-color={color.gray[400]} />
      </view>
    </view>
  );
}
