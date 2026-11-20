// 메신저 방의 채팅 단어 UI(ADR-0170) — 머리 아래 이번 주 줄 · 내 말풍선 아래 얻은 단어 칩.
// 단어 칩은 배운 단어의 사전 꼴(맛있다)이라 한국어 그대로 보입니다(콘텐츠 값, UI 리터럴이 아님).

import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import trophy from "@libitums/icons/lynx/trophy";

import { useUiCopy } from "../../lib/ui-copy";
import { chatWordsTestIds as ids } from "../ranking/ranking.contract";
import type { ChatWordsResult } from "./chat-feedback.contract";

import "./chat-words.css";

const TROPHY = trophy.replace(/currentColor/g, color.brand.primary);
const CHEVRON = arrowRight.replace(/currentColor/g, color.fg.brand);
// 보이는 높이 40 → 터치 44(위아래 2). 화면 지역 상수라 토큰이 없습니다.
const SLOP = { top: "2px", bottom: "2px", left: "0px", right: "0px" } as const;

export type ChatWordsStripProps = {
  readonly words: number;
  /** 그룹 안 순위 — 아직 없으면 null. */
  readonly rank: number | null;
  readonly onOpen: () => void;
};

export function ChatWordsStrip({ words, rank, onOpen }: ChatWordsStripProps): ReactNode {
  const copy = useUiCopy().ranking.chat;
  return (
    <view
      className="chat-words-strip"
      data-testid={ids.strip}
      hit-slop={SLOP}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={copy.stripLabel(words, rank)}
      bindtap={() => {
        "background only";
        onOpen();
      }}
    >
      <svg className="chat-words-icon" content={TROPHY} />
      <text className="chat-words-count">{copy.stripCount(words)}</text>
      <text className="chat-words-rank">{copy.stripRank(rank)}</text>
      <svg className="chat-words-icon" content={CHEVRON} />
    </view>
  );
}

export function ChatWordsEarned({ result }: { readonly result: ChatWordsResult }): ReactNode {
  const copy = useUiCopy().ranking.chat;
  return (
    <view className="chat-words-earned" data-testid={ids.earned}>
      {result.counted.length === 0 ? null : (
        <view className="chat-words-plus">
          <text className="chat-words-plus-text">{copy.earned(result.counted.length)}</text>
        </view>
      )}
      {result.counted.map((word, index) => (
        <view key={word.id} className="chat-words-chip" data-testid={ids.word(index)}>
          <text className="chat-words-chip-text">{word.surface}</text>
        </view>
      ))}
      {result.pending.map((word, index) => (
        <view key={word.id} className="chat-words-pending" data-testid={ids.pending(index)}>
          <text className="chat-words-pending-text">{`${word.surface} · ${copy.pending}`}</text>
        </view>
      ))}
    </view>
  );
}
