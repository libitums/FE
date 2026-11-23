import type { ReactNode } from "@lynx-js/react";

import camera from "@libitums/icons/lynx/camera";
import circle from "@libitums/icons/lynx/circle";
import mic from "@libitums/icons/lynx/mic";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import type { ChatMediaAvailability } from "./chat-media.contract";
import { SLOP_PILL, SLOP_ROUND } from "./hit-slop";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./messenger-chat.css";
import "./chat-media.css";

export type MoreButtonState = "closed" | "open";

/** 꺼진 알약(서버 방의 wait · pending · done)은 흐리고 탭을 받지 않으며, 낭독에 까닭을 붙입니다. */
type PillState = { readonly availability?: ChatMediaAvailability; readonly name?: string };
export type SnapshotPillProps = PillState & {
  readonly price: number;
  readonly onTap: () => void;
  /** 예시 스냅샷 단계(ADR-0146 추가) — 가격 자리에 「FREE」가 서고 꺼진 상태여도 누를 수 있습니다. */
  readonly free?: boolean;
};
export type SnapVoicePillProps = PillState & {
  readonly price: number;
  readonly onTap: () => void;
  /** 예시 음성 단계 — 가격 자리에 「FREE」가 서고 꺼진 상태여도 누를 수 있습니다. */
  readonly free?: boolean;
};
export type MoreButtonProps = { readonly state: MoreButtonState; readonly onTap: () => void };
export type FeatureRowProps = {
  readonly photoPrice: number;
  readonly voicePrice: number;
  /** 서버 방의 알약 상태(ADR-0146 「앱 연결」) — 없으면 ready(가짜 출처). */
  readonly photoAvailability?: ChatMediaAvailability;
  readonly voiceAvailability?: ChatMediaAvailability;
  /** 꺼진 알약 낭독의 상대 이름. */
  readonly name?: string;
  readonly moreState: MoreButtonState;
  readonly onSnapshot: () => void;
  readonly onSnapVoice: () => void;
  readonly onMore: () => void;
  /** 예시 스냅샷 단계 — 사진 알약이 「FREE」로 섭니다. */
  readonly photoFree?: boolean;
  /** 예시 음성 단계 — 음성 알약이 「FREE」로 섭니다. */
  readonly voiceFree?: boolean;
};

// 기능 알약 줄 — 알약 둘(가로 스크롤)과 오른쪽 고정 「…」. 알약은 명시 변형 둘이고 가격은 화폐 아이콘 없이 수만 그립니다.
export function FeatureRow({
  photoPrice,
  voicePrice,
  photoAvailability = "ready",
  voiceAvailability = "ready",
  name = "",
  moreState,
  onSnapshot,
  onSnapVoice,
  onMore,
  photoFree = false,
  voiceFree = false,
}: FeatureRowProps): ReactNode {
  return (
    <view className="messenger-chat-features" data-testid={ids.featureRow}>
      <scroll-view
        className="messenger-chat-features-scroll"
        scroll-orientation="horizontal"
        scroll-bar-enable={false}
      >
        <view className="messenger-chat-features-pills">
          <SnapshotPill
            price={photoPrice}
            availability={photoAvailability}
            name={name}
            onTap={onSnapshot}
            free={photoFree}
          />
          <SnapVoicePill
            price={voicePrice}
            availability={voiceAvailability}
            name={name}
            onTap={onSnapVoice}
            free={voiceFree}
          />
        </view>
      </scroll-view>
      <MoreButton state={moreState} onTap={onMore} />
    </view>
  );
}

export function SnapshotPill({
  price,
  availability = "ready",
  name = "",
  onTap,
  free = false,
}: SnapshotPillProps): ReactNode {
  const chat = useUiCopy().messengerChat;
  const copy = chat.features;
  const off = !free && availability !== "ready";
  const label = free
    ? `${copy.snapshot}, ${chat.guide.free}`
    : copy.pillLabel(copy.snapshot, price);
  return (
    <view
      className={`messenger-chat-pill messenger-chat-pill-snapshot${off ? " messenger-chat-pill-off" : ""}`}
      id={ids.snapshot}
      data-testid={ids.snapshot}
      data-state={off ? "off" : "on"}
      hit-slop={SLOP_PILL}
      accessibility-element={true}
      accessibility-traits={off ? "disabled" : "button"}
      accessibility-label={
        off ? `${label}, ${chat.media.hint(availability, "photo", name)}` : label
      }
      bindtap={() => {
        "background only";
        if (!off) onTap();
      }}
    >
      <svg className="messenger-chat-icon-xs" content={camera} current-color={color.white} />
      <text className="messenger-chat-pill-name">{copy.snapshot}</text>
      <text className="messenger-chat-pill-price">{free ? chat.guide.free : String(price)}</text>
    </view>
  );
}

export function SnapVoicePill({
  price,
  availability = "ready",
  name = "",
  onTap,
  free = false,
}: SnapVoicePillProps): ReactNode {
  const chat = useUiCopy().messengerChat;
  const copy = chat.features;
  const off = !free && availability !== "ready";
  const label = free
    ? `${copy.snapVoice}, ${chat.guide.free}`
    : copy.pillLabel(copy.snapVoice, price);
  return (
    <view
      className={`messenger-chat-pill messenger-chat-pill-voice${off ? " messenger-chat-pill-off" : ""}`}
      id={ids.snapVoice}
      data-testid={ids.snapVoice}
      data-state={off ? "off" : "on"}
      hit-slop={SLOP_PILL}
      accessibility-element={true}
      accessibility-traits={off ? "disabled" : "button"}
      accessibility-label={
        off ? `${label}, ${chat.media.hint(availability, "voice", name)}` : label
      }
      bindtap={() => {
        "background only";
        if (!off) onTap();
      }}
    >
      <svg className="messenger-chat-icon-xs" content={mic} current-color={color.fg.brand} />
      <text className="messenger-chat-pill-name">{copy.snapVoice}</text>
      <text className="messenger-chat-pill-price">{free ? chat.guide.free : String(price)}</text>
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
