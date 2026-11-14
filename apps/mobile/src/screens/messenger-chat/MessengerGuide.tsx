import type { ReactNode } from "@lynx-js/react";
import { useGlobalProps } from "@lynx-js/react";

import { Overlay } from "@libitums/ui-lynx/overlay";

import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { ChatListRow } from "./ChatListRow";
import type { ChatRoomSummary } from "./chat-source.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import type { GuideStep } from "./messenger-guide";

import "./messenger-guide.css";

// 덕수쌤 첫 입장 안내(사용자 결정 2026-11-13, 시안 KMsLcR9rCRbVjqRtGcC2Ji 2판).
// 목록: 화면 전체를 덮고 덕수쌤 줄만 맨 위에 떠 있습니다 — 원본 줄에 구멍을 뚫지 않고 같은 줄 부품을 다시 그려 위치를 재지 않습니다.
// 방: 머리 · 로그만 덮고(입력 줄 영역은 밝게) 아래쪽 말풍선이 가리킬 자리를 말합니다.

type Bubble = {
  readonly avatarUrl: string | null;
  readonly title: string;
  readonly body: string;
  readonly step?: string;
  readonly children: ReactNode;
};

function GuideBubble({ avatarUrl, title, body, step, children }: Bubble): ReactNode {
  return (
    <view className="messenger-guide-bubble">
      <view
        className="messenger-guide-copy"
        flatten={false}
        accessibility-element={true}
        accessibility-label={`${title}. ${body}${step === undefined ? "" : ` ${step}`}`}
      >
        <view className="messenger-guide-top" accessibility-elements-hidden={true}>
          {avatarUrl === null ? (
            <view className="messenger-guide-avatar messenger-guide-avatar-blank" />
          ) : (
            <image className="messenger-guide-avatar" src={avatarUrl} mode="aspectFill" />
          )}
          <text className="messenger-guide-title">{title}</text>
          {step === undefined ? null : <text className="messenger-guide-step">{step}</text>}
        </view>
        <text className="messenger-guide-body" accessibility-elements-hidden={true}>
          {body}
        </text>
      </view>
      <view className="messenger-guide-actions">{children}</view>
    </view>
  );
}

function GuideButton(props: {
  readonly label: string;
  readonly testId: string;
  readonly primary: boolean;
  readonly onTap: () => void;
}): ReactNode {
  return (
    <view
      className={`messenger-guide-button${props.primary ? " messenger-guide-button-primary" : ""}`}
      data-testid={props.testId}
      flatten={false}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={props.label}
      accessibility-enable-tap={true}
      catchtap={() => {
        "background only";
        props.onTap();
      }}
    >
      <text
        className={`messenger-guide-button-text${props.primary ? " messenger-guide-button-text-primary" : ""}`}
      >
        {props.label}
      </text>
    </view>
  );
}

export type ListGuideProps = {
  readonly room: ChatRoomSummary;
  readonly now: number;
  readonly onOpen: () => void;
  readonly onSkip: () => void;
};

/** 목록 첫 입장 — 덕수쌤 줄만 떠 있는 오버레이. 줄이나 「Chat with …」 = 방 열기, Skip · 뒤로가기 = 닫기. */
export function MessengerListGuide({ room, now, onOpen, onSkip }: ListGuideProps): ReactNode {
  const copy = useUiCopy().messengerChat.guide;
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const name = room.counterpart.name;
  const skip = () => {
    "background only";
    onSkip();
  };
  useLayerBack(skip);
  return (
    <view
      className="messenger-guide-list"
      data-testid={ids.guideList}
      event-through={false}
      style={{ paddingTop: `${insets.top}px` }}
    >
      <Overlay scope="screen" surface="dialog" dismiss="none" />
      <view className="messenger-guide-list-body" accessibility-exclusive-focus={true}>
        <view className="messenger-guide-float">
          <ChatListRow room={room} now={now} onOpen={() => onOpen()} />
        </view>
        <view className="messenger-guide-tail messenger-guide-tail-up" />
        <GuideBubble
          avatarUrl={room.counterpart.avatarUrl}
          title={copy.cardTitle(name)}
          body={copy.cardBody}
        >
          <GuideButton
            label={copy.skip}
            testId={ids.guideListSkip}
            primary={false}
            onTap={onSkip}
          />
          <GuideButton
            label={copy.cardButton(name)}
            testId={ids.guideListOpen}
            primary={true}
            onTap={onOpen}
          />
        </GuideBubble>
      </view>
    </view>
  );
}

export type RoomGuideProps = {
  readonly steps: readonly GuideStep[];
  readonly index: number;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly onNext: () => void;
  readonly onSkip: () => void;
};

/** 방 첫 입장 코치마크 — 머리 · 로그 위만 덮습니다. 아무 데나 탭 = Next, 뒤로가기 = Skip. */
export function MessengerRoomGuide({
  steps,
  index,
  name,
  avatarUrl,
  onNext,
  onSkip,
}: RoomGuideProps): ReactNode {
  const copy = useUiCopy().messengerChat.guide;
  const step = steps[index] ?? "chat";
  const last = index >= steps.length - 1;
  const skip = () => {
    "background only";
    onSkip();
  };
  useLayerBack(skip);
  return (
    <view
      className="messenger-guide-room"
      data-testid={ids.guideCoach}
      data-step={step}
      flatten={false}
      catchtap={() => {
        "background only";
        onNext();
      }}
    >
      <Overlay scope="area" />
      <view className="messenger-guide-room-body" accessibility-exclusive-focus={true}>
        <GuideBubble
          avatarUrl={avatarUrl}
          title={name}
          body={copy.steps[step]}
          step={copy.stepOf(index + 1, steps.length)}
        >
          <GuideButton
            label={copy.skip}
            testId={ids.guideCoachSkip}
            primary={false}
            onTap={onSkip}
          />
          <GuideButton
            label={last ? copy.done : copy.next}
            testId={ids.guideCoachNext}
            primary={true}
            onTap={onNext}
          />
        </GuideBubble>
        <view
          className={`messenger-guide-tail messenger-guide-tail-down messenger-guide-tail-${step}`}
        />
      </view>
    </view>
  );
}

/** 방 코치마크가 가리키는 입력 줄 부품에 고리를 거는 클래스(독 바깥 상자에 붙임). */
export function guideTargetClass(step: GuideStep | null): string {
  return step === null ? "" : ` messenger-guide-target-${step}`;
}
