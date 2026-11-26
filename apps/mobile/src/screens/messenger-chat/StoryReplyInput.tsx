// 스토리 보기의 답장 칸(ADR-0178 D5 개정) — 진짜 입력 칸 · 보내기 단추 · 실패 안내, 그리고 보낸 뒤의 「Sent · Open chat」 알림.
// 키보드 높이는 대화방 입력 줄과 같은 규칙(`phoneKeyboardHeightOf`)으로 재어 보기가 칸을 그 위로 올립니다.

import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import arrowUp from "@libitums/icons/lynx/arrow-up";

import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import {
  friendStoriesTestIds as ids,
  type FriendStoriesCopy,
  type StoryReplyFailure,
} from "./friend-stories.contract";
import { phoneKeyboardHeightOf } from "./keyboard-height";
import { canSendStoryReply } from "./story-inline-reply";
import { noTap } from "./StoryViewerParts";

import "./story-reply-input.css";

/** 답장 칸 `<input>`의 element id — 보낸 뒤 · 밖을 누르면 이 id로 초점을 내립니다. 보기는 한 번에 하나만 섭니다. */
export const STORY_REPLY_INPUT_ID = "story-viewer-reply-input";

const SLOP = { top: "8px", bottom: "8px", left: "8px", right: "8px" } as const;

type NativeInputEvent = { readonly detail: { readonly value: string } };

export type StoryReplyInputProps = {
  readonly name: string;
  readonly copy: FriendStoriesCopy;
  readonly sending: boolean;
  readonly error: StoryReplyFailure | null;
  readonly onFocusChange: (focused: boolean) => void;
  readonly onSend: (text: string) => void;
  /** 글을 고침 — 실패 안내를 걷습니다. */
  readonly onEdit: () => void;
  readonly onKeyboardHeight: (height: number) => void;
};

/** 보낸 뒤 비울 때는 보기가 `key`를 바꿔 다시 마운트합니다(default-value ""). 실패면 글이 그대로 남습니다. */
export function StoryReplyInput({
  name,
  copy,
  sending,
  error,
  onFocusChange,
  onSend,
  onEdit,
  onKeyboardHeight,
}: StoryReplyInputProps): ReactNode {
  const [text, setText] = useState("");
  const enabled = canSendStoryReply(text, sending);
  const placeholder = copy.viewer.replyPlaceholder(name);
  const send = () => {
    "background only";
    if (enabled) onSend(text);
  };
  // 실제 키보드 높이(툴바 포함) — `keyboardheightchange`는 @lynx-js/types의 input 속성에 없어 대화방 입력 줄처럼 펼침으로 겁니다.
  const keyboardProps = {
    bindkeyboardheightchange: (event: { readonly detail: { readonly height?: unknown } }) => {
      "background only";
      const info = typeof SystemInfo === "undefined" ? undefined : SystemInfo;
      onKeyboardHeight(phoneKeyboardHeightOf(event.detail.height, info));
    },
  };
  return (
    <>
      {error === null ? null : (
        <text className="story-reply-error" data-testid={ids.replyError}>
          {error === "coins" ? copy.viewer.coinsShort : copy.viewer.sendFailed}
        </text>
      )}
      <view className="story-reply" data-testid={ids.reply} catchtap={noTap}>
        <input
          id={STORY_REPLY_INPUT_ID}
          className="story-reply-input"
          data-testid={ids.replyInput}
          default-value=""
          placeholder={placeholder}
          maxlength={CHAT_PLACEHOLDERS.messageMaxLength}
          confirm-type="send"
          accessibility-element={true}
          accessibility-label={placeholder}
          bindinput={(event: NativeInputEvent) => {
            "background only";
            // Android는 키보드가 내려가며 조합을 마칠 때 같은 글로 input을 한 번 더 보냅니다 — 글이 바뀐 때만 안내를 걷습니다(기기 확인).
            if (event.detail.value === text) return;
            setText(event.detail.value);
            onEdit();
          }}
          bindfocus={() => {
            "background only";
            onFocusChange(true);
          }}
          bindblur={() => {
            "background only";
            onFocusChange(false);
          }}
          bindconfirm={send}
          {...keyboardProps}
        />
        <view
          className={enabled ? "story-reply-send" : "story-reply-send story-reply-send-off"}
          data-testid={ids.replySend}
          hit-slop={SLOP}
          accessibility-element={true}
          accessibility-label={copy.viewer.send}
          accessibility-traits={enabled ? "button" : "disabled"}
          accessibility-enable-tap={enabled}
          flatten={false}
          bindtap={enabled ? send : undefined}
        >
          <svg className="story-reply-send-icon" content={arrowUp} current-color={color.white} />
        </view>
      </view>
    </>
  );
}

export type StorySentToastProps = {
  readonly copy: FriendStoriesCopy;
  readonly name: string;
  readonly onOpenChat: () => void;
};

/** 「Sent」 + 「Open chat」 — 보기 안 답장 칸 위. 낭독은 보기가 뜰 때 한 번 합니다(「Sent to <이름>」). */
export function StorySentToast({ copy, name, onOpenChat }: StorySentToastProps): ReactNode {
  return (
    <view className="story-sent" data-testid={ids.sent} flatten={false}>
      <text
        className="story-sent-text"
        accessibility-element={true}
        accessibility-label={copy.viewer.sentLabel(name)}
      >
        {copy.viewer.sent}
      </text>
      <view
        className="story-sent-open"
        data-testid={ids.openChat}
        hit-slop={SLOP}
        accessibility-element={true}
        accessibility-label={copy.viewer.openChat}
        accessibility-traits="button"
        accessibility-enable-tap={true}
        flatten={false}
        bindtap={() => {
          "background only";
          onOpenChat();
        }}
      >
        <text className="story-sent-open-text">{copy.viewer.openChat}</text>
      </view>
    </view>
  );
}
