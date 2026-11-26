import type { ReactNode } from "@lynx-js/react";

import { Avatar } from "@libitums/ui-lynx/avatar";
import { ChatBubble } from "@libitums/ui-lynx/chat-bubble";

import type {
  ChatIncomingRowProps,
  ChatOutgoingRowProps,
  ChatPhotoProps,
  ChatTextBubbleProps,
} from "./chat.contract";

import "./chat.css";

/** 보이는 32 → 손가락 자리 44, 사방(줄 사이 간격 8 안). */
const AVATAR_SLOP = "6px";

// 상대 줄 — 왼쪽 위 아바타 + 쌓음(사진 · 말풍선). `avatar.profile`이 있으면 아바타가 프로필 단추입니다(ADR-0178 개정 ⟨대화방⟩).
export function ChatIncomingRow({ avatar, testId, children }: ChatIncomingRowProps): ReactNode {
  const face = (
    <Avatar
      name={avatar.name}
      imageSource={avatar.imageUrl ?? undefined}
      size="sm"
      accessibility="hidden"
    />
  );
  const { profile } = avatar;
  return (
    <view className="chat-row" data-testid={testId}>
      {profile === undefined ? (
        face
      ) : (
        <view
          data-testid={profile.testId}
          flatten={false}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={profile.label}
          accessibility-enable-tap={true}
          hit-slop={AVATAR_SLOP}
          catchtap={() => {
            "background only";
            profile.onTap();
          }}
        >
          {face}
        </view>
      )}
      <view className="chat-stack">{children}</view>
    </view>
  );
}

export function ChatOutgoingRow({ testId, children }: ChatOutgoingRowProps): ReactNode {
  return (
    <view className="chat-row chat-row-outgoing" data-testid={testId}>
      {children}
    </view>
  );
}

export function ChatTextBubble({
  direction,
  speaker,
  message,
  translation,
  annotation,
}: ChatTextBubbleProps): ReactNode {
  // 줄 순서(ADR-0188 개정 D8): [한국어 / 로마자] → 구분선 → 뜻. 로마자가 없으면 번역도 구분선 아래 뜻 줄로 둡니다. 뜻이 없으면 줄도 구분선도 없습니다.
  const meaning = translation?.trim();
  const lines = annotation ?? (meaning ? { meaning } : undefined);
  return (
    <ChatBubble
      direction={direction}
      message={message}
      speaker={speaker}
      size="m"
      contentLanguage="learning"
      languageTag="ko"
      {...(lines === undefined ? {} : { annotation: lines })}
    />
  );
}

// 사진 메시지 — ChatBubble에 그림 갈래가 없어 말풍선 위 카드로 둡니다.
export function ChatPhoto({ src, aspect, testId }: ChatPhotoProps): ReactNode {
  return (
    <image
      className={aspect === "portrait-9x16" ? "chat-photo-9x16" : "chat-photo-3x4"}
      data-testid={testId}
      src={src}
      mode="aspectFill"
    />
  );
}
