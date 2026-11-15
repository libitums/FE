import type { ReactNode } from "@lynx-js/react";

import { clockLabel } from "../../lib/ui-copy-chat-parts";
import { useUiCopy } from "../../lib/ui-copy";
import { chatMediaTestIds as ids, type ChatMediaNotice } from "./chat-media.contract";
import type { ChatMediaKind } from "./chat-source.contract";
import { clockOf } from "./safety-rules";

import "./safety.css";

export type ChatMediaNoticeRowProps = {
  readonly notice: ChatMediaNotice;
  readonly media: ChatMediaKind;
  /** 상한이 풀리는 시각(ms) — 기기 시각 "h:mm"으로 보입니다. */
  readonly until: number | null;
  readonly name: string;
};

// 서버 사진 · 음성의 회색 안내 줄입니다(ADR-0146 「앱 연결」) — 고지 줄(ChatNoticeRow)과 같은 모양 · 아이콘 없음, 문장 하나로 읽힙니다.
export function ChatMediaNoticeRow({
  notice,
  media,
  until,
  name,
}: ChatMediaNoticeRowProps): ReactNode {
  const copy = useUiCopy().messengerChat.media;
  const clock = until === null ? null : clockOf(until);
  const text = copy.notice(
    notice,
    media,
    name,
    clock === null ? null : clockLabel(clock.hour, clock.minute),
  );
  return (
    <view
      className="chat-notice"
      data-testid={ids.notice}
      data-notice={notice}
      flatten={false}
      accessibility-element={true}
      accessibility-label={text}
    >
      <view className="chat-notice-rule" />
      <view className="chat-notice-body" accessibility-elements-hidden={true}>
        <text className="chat-notice-text">{text}</text>
      </view>
      <view className="chat-notice-rule" />
    </view>
  );
}
