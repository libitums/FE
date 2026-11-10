import type { ReactNode } from "@lynx-js/react";

import camera from "@libitums/icons/lynx/camera";
import circle from "@libitums/icons/lynx/circle";
import mic from "@libitums/icons/lynx/mic";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { SLOP_PILL, SLOP_ROUND } from "./hit-slop";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./messenger-chat.css";

export type MoreButtonState = "closed" | "open";

export type SnapshotPillProps = { readonly price: number; readonly onTap: () => void };
export type SnapVoicePillProps = { readonly price: number; readonly onTap: () => void };
export type MoreButtonProps = { readonly state: MoreButtonState; readonly onTap: () => void };
export type FeatureRowProps = {
  readonly photoPrice: number;
  readonly voicePrice: number;
  readonly moreState: MoreButtonState;
  readonly onSnapshot: () => void;
  readonly onSnapVoice: () => void;
  readonly onMore: () => void;
};

// 기능 알약 줄 — 알약 둘(가로 스크롤)과 오른쪽 고정 「…」. 알약은 명시 변형 둘이고 가격은 화폐 아이콘 없이 수만 그립니다.
export function FeatureRow({
  photoPrice,
  voicePrice,
  moreState,
  onSnapshot,
  onSnapVoice,
  onMore,
}: FeatureRowProps): ReactNode {
  return (
    <view className="messenger-chat-features" data-testid={ids.featureRow}>
      <scroll-view
        className="messenger-chat-features-scroll"
        scroll-orientation="horizontal"
        scroll-bar-enable={false}
      >
        <view className="messenger-chat-features-pills">
          <SnapshotPill price={photoPrice} onTap={onSnapshot} />
          <SnapVoicePill price={voicePrice} onTap={onSnapVoice} />
        </view>
      </scroll-view>
      <MoreButton state={moreState} onTap={onMore} />
    </view>
  );
}

export function SnapshotPill({ price, onTap }: SnapshotPillProps): ReactNode {
  const copy = useUiCopy().messengerChat.features;
  return (
    <view
      className="messenger-chat-pill messenger-chat-pill-snapshot"
      id={ids.snapshot}
      data-testid={ids.snapshot}
      hit-slop={SLOP_PILL}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={copy.pillLabel(copy.snapshot, price)}
      bindtap={() => {
        "background only";
        onTap();
      }}
    >
      <svg className="messenger-chat-icon-xs" content={camera} current-color={color.white} />
      <text className="messenger-chat-pill-name">{copy.snapshot}</text>
      <text className="messenger-chat-pill-price">{String(price)}</text>
    </view>
  );
}

export function SnapVoicePill({ price, onTap }: SnapVoicePillProps): ReactNode {
  const copy = useUiCopy().messengerChat.features;
  return (
    <view
      className="messenger-chat-pill messenger-chat-pill-voice"
      id={ids.snapVoice}
      data-testid={ids.snapVoice}
      hit-slop={SLOP_PILL}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={copy.pillLabel(copy.snapVoice, price)}
      bindtap={() => {
        "background only";
        onTap();
      }}
    >
      <svg className="messenger-chat-icon-xs" content={mic} current-color={color.fg.brand} />
      <text className="messenger-chat-pill-name">{copy.snapVoice}</text>
      <text className="messenger-chat-pill-price">{String(price)}</text>
    </view>
  );
}

// 가로 점 셋(⋯)입니다. 아이콘 묶음에 가로 더보기 그림이 없어(loading-dots는 점 고리라 기기에서 로딩 표시로 읽혔습니다 —
// device-findings-1 D2) 속이 찬 작은 원 `circle`을 가로로 셋 놓습니다.
export function MoreButton({ state, onTap }: MoreButtonProps): ReactNode {
  const copy = useUiCopy().messengerChat.features;
  const open = state === "open";
  return (
    <view
      className={open ? "messenger-chat-more messenger-chat-more-open" : "messenger-chat-more"}
      id={ids.more}
      data-testid={ids.more}
      data-state={state}
      hit-slop={SLOP_ROUND}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={open ? copy.moreOpen : copy.more}
      bindtap={() => {
        "background only";
        onTap();
      }}
    >
      <view className="messenger-chat-more-dots" accessibility-elements-hidden={true}>
        {[0, 1, 2].map((index) => (
          <svg
            key={index}
            className="messenger-chat-more-dot"
            content={circle}
            current-color={color.fg["neutral-muted"]}
          />
        ))}
      </view>
    </view>
  );
}
