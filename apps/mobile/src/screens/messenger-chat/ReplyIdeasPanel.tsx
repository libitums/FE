import type { ReactNode } from "@lynx-js/react";

import keyboard from "@libitums/icons/lynx/keyboard";
import { color } from "@libitums/design-tokens";

import { ChatReplyOption } from "../../components/chat/ChatReplyOption";
import { useUiCopy } from "../../lib/ui-copy";
import type { ChatReplyIdea } from "./chat-source.contract";
import { SLOP_SMALL } from "./hit-slop";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./messenger-chat.css";

export type ReplyIdeasPanelProps = {
  readonly quote: string | null;
  readonly ideas: readonly ChatReplyIdea[];
  readonly picked: number | null;
  readonly onPick: (index: number) => void;
  readonly onTypeMyself: () => void;
  /** 판 아래에 더할 안전 영역입니다(슬롯 높이가 이 인셋을 포함합니다). 없으면 0. */
  readonly bottomInset?: number;
  /**
   * 판 높이(px)입니다 — 슬롯 높이를 그대로 받습니다. 기기에서 부모 flex 높이에 기대면(퍼센트 기준) 보기 목록이 내용 높이로 풀려
   * 슬롯 밖으로 넘쳤습니다(device-findings-1 D7). 없으면 부모 flex에 맡깁니다.
   */
  readonly height?: number;
};

// 답장 보기 판 — 위에 상대의 마지막 글 인용과 「Type myself」, 아래에 보기 셋(한국어 · 로마자 · 영어).
// 스크롤 칸의 높이를 px로 정합니다. Lynx scroll-view는 flex 기준(1 1 0px)만으로는 높이가 정해지지 않아
// 내용 높이로 자라 버려(device-findings-1 D7 — SE에서 셋째 보기가 화면 밖으로 잘리고 스크롤도 안 됨),
// 판 높이에서 위 여백 12 · 머리 32 · 사이 8 · 아래 여백(inset + 8)을 뺀 값을 직접 줍니다.
export function ideasScrollHeight(panelHeight: number, bottomInset: number): number {
  return Math.max(0, panelHeight - 12 - 32 - 8 - (bottomInset + 8));
}

// 보기를 탭하면 입력 칸을 채울 뿐 보내지 않습니다. 슬롯 높이 안에서 세로로 스크롤됩니다.
export function ReplyIdeasPanel({
  quote,
  ideas,
  picked,
  onPick,
  onTypeMyself,
  bottomInset,
  height,
}: ReplyIdeasPanelProps): ReactNode {
  const copy = useUiCopy().messengerChat.ideas;
  return (
    <view
      className="messenger-chat-ideas"
      data-testid={ids.ideasPanel}
      style={{
        paddingBottom: `${(bottomInset ?? 0) + 8}px`,
        ...(height === undefined ? {} : { height: `${height}px` }),
      }}
    >
      <view className="messenger-chat-ideas-head">
        {quote === null ? (
          <view className="messenger-chat-ideas-spacer" />
        ) : (
          <text className="messenger-chat-ideas-quote" data-testid={ids.ideasQuote}>
            {copy.quote(quote)}
          </text>
        )}
        <view
          className="messenger-chat-ideas-myself"
          data-testid={ids.ideasTypeMyself}
          hit-slop={SLOP_SMALL}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={copy.typeMyself}
          bindtap={() => {
            "background only";
            onTypeMyself();
          }}
        >
          <svg
            className="messenger-chat-icon-xs"
            content={keyboard}
            current-color={color.fg.neutral}
          />
          <text className="messenger-chat-ideas-myself-label" accessibility-element={false}>
            {copy.typeMyself}
          </text>
        </view>
      </view>
      <scroll-view
        className="messenger-chat-ideas-scroll"
        style={
          height === undefined
            ? undefined
            : { height: `${ideasScrollHeight(height, bottomInset ?? 0)}px` }
        }
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="messenger-chat-ideas-list">
          {ideas.map((idea, index) => (
            <ChatReplyOption
              key={`${index}:${idea.ko}`}
              primary={idea.ko}
              lines={[idea.roman, idea.en]}
              state={picked === index ? "picked" : "idle"}
              testId={ids.idea(index)}
              onPick={() => onPick(index)}
            />
          ))}
        </view>
      </scroll-view>
    </view>
  );
}
