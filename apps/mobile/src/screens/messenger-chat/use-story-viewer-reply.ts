// 스토리 보기의 답장 상태(ADR-0178 D5 개정) — 입력 중 · 보내는 중 · 실패 안내 · 「Sent」 알림 · 칸 비우기 · 키보드 높이 · 무료 안내.
// 보내기는 `onReply`(목록이 출처로 보냄)가 지고, 이 훅은 보기가 멈출지 · 칸을 어디에 둘지만 정합니다. 상태는 보기 단위라 장 · 인물을
// 넘겨도 「Sent」 알림은 남습니다(보기를 닫으면 함께 사라짐).

import { useEffect, useRef, useState } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";
import { playSound } from "../../lib/sound-effects";
import { blurInputById } from "./chat-input-focus";
import type {
  FriendStoriesCopy,
  StoryReplyFailure,
  StoryReplyOutcome,
  StoryReplyVia,
  StoryViewerItem,
} from "./friend-stories.contract";
import { LIST_NOTICE_MS } from "./messenger-list-notice";
import { canSendStoryReply } from "./story-inline-reply";
import { STORY_REPLY_INPUT_ID } from "./StoryReplyInput";

/** 키보드 윗변과 답장 칸 사이 틈(pt/dp). */
const KEYBOARD_GAP = 8;
/** 덮던 시트가 닫힌 다음 프레임 — Android가 남은 입력 칸으로 초점을 옮겨 키보드를 올리지 않게 내립니다(기기 메모). */
const NEXT_FRAME_MS = 16;

export type StoryViewerReply = {
  readonly typing: boolean;
  readonly sending: boolean;
  readonly error: StoryReplyFailure | null;
  /** 「Sent」 알림이 떠 있는 장(그 장의 인물 이름에 씀) — 없으면 null. */
  readonly sentItem: StoryViewerItem | null;
  /** 답장 칸의 key 조각 — 보내면 바뀌어 칸이 비워집니다. */
  readonly epoch: number;
  /** 보기를 멈출 까닭(입력 · 보내는 중) — 보낸 뒤 알림 동안은 멈추지 않습니다(사용자 결정 2026-11-26). */
  readonly holding: boolean;
  readonly freeShown: (item: StoryViewerItem) => boolean;
  /** 아래 묶음의 아래 여백(px) — 입력 중이면 키보드 위, 아니면 바닥 인셋 + 16. */
  readonly bottomPadding: (bottomInset: number) => number;
  readonly send: (item: StoryViewerItem, text: string, via: StoryReplyVia) => void;
  readonly setTyping: (focused: boolean) => void;
  readonly edit: () => void;
  readonly measure: (height: number) => void;
  /** 입력 중이면 키보드를 내리고 true — 뒤로 · 밖 누름이 먼저 이것을 부릅니다. */
  readonly dismissKeyboard: () => boolean;
};

export function useStoryViewerReply({
  index,
  copy,
  covered,
  keyboardHeight,
  onReply,
  onKeyboardHeight,
}: {
  readonly index: number;
  readonly copy: FriendStoriesCopy;
  readonly covered: boolean;
  readonly keyboardHeight: number;
  readonly onReply: (
    item: StoryViewerItem,
    text: string,
    via: StoryReplyVia,
  ) => Promise<StoryReplyOutcome>;
  readonly onKeyboardHeight: ((height: number) => void) | undefined;
}): StoryViewerReply {
  const [typing, setTypingState] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<StoryReplyFailure | null>(null);
  const [sentItem, setSentItem] = useState<StoryViewerItem | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [usedFree, setUsedFree] = useState<ReadonlySet<string>>(new Set());
  const [measured, setMeasured] = useState(0);
  const typingRef = useRef(false);
  const live = useRef(true);
  useEffect(
    () => () => {
      live.current = false;
    },
    [],
  );

  // 핸들러 · 효과에서만 부릅니다 — 메인 스레드 번들에서 빠집니다(ADR-0149).
  const setTyping = (focused: boolean) => {
    "background only";
    typingRef.current = focused;
    setTypingState(focused);
  };
  const dismissKeyboard = (): boolean => {
    "background only";
    if (!typingRef.current) return false;
    blurInputById(STORY_REPLY_INPUT_ID);
    setTyping(false);
    return true;
  };

  // 장이 바뀌면 실패 안내를 걷습니다(칸은 장마다 새로 섭니다). 「Sent」 알림은 장 · 인물이 바뀌어도 남습니다(사용자 결정 2026-11-26).
  useEffect(() => {
    setError(null);
  }, [index]);
  // 알림은 3초(목록 안내 줄과 같은 시간) 뒤 걷힙니다 — 그동안에도 보기는 이어 갑니다(인스타 방식, 사용자 결정 2026-11-26).
  useEffect(() => {
    if (sentItem === null) return undefined;
    const handle = setTimeout(() => setSentItem(null), LIST_NOTICE_MS);
    return () => clearTimeout(handle);
  }, [sentItem]);
  // 시트(엽전 상점 등)가 덮으면 키보드를 내리고(시트 위에 키보드가 남지 않게 — Android 기기 확인), 닫히면 다음 프레임에 한 번 더
  // 입력 초점을 내립니다.
  const wasCovered = useRef(covered);
  useEffect(() => {
    const uncovered = wasCovered.current && !covered;
    wasCovered.current = covered;
    if (covered) {
      dismissKeyboard();
      return undefined;
    }
    if (!uncovered) return undefined;
    const handle = setTimeout(() => blurInputById(STORY_REPLY_INPUT_ID), NEXT_FRAME_MS);
    return () => clearTimeout(handle);
  }, [covered]);

  const send = (item: StoryViewerItem, text: string, via: StoryReplyVia) => {
    "background only";
    if (!canSendStoryReply(text, sending)) return;
    playSound("button");
    setSending(true);
    setError(null);
    void onReply(item, text.trim(), via).then((outcome) => {
      if (!live.current) return;
      setSending(false);
      if (outcome.kind === "failed") {
        setError(outcome.reason);
        announce(outcome.reason === "coins" ? copy.viewer.coinsShort : copy.viewer.sendFailed);
        return;
      }
      setUsedFree((ids) => new Set(ids).add(item.story.id));
      setEpoch((value) => value + 1);
      dismissKeyboard();
      setSentItem(item);
      announce(copy.viewer.sentLabel(item.name));
    });
  };

  const lifted = measured > 0 ? measured : keyboardHeight;
  return {
    typing,
    sending,
    error,
    sentItem,
    epoch,
    holding: typing || sending,
    freeShown: (item) => item.story.freeReply && !usedFree.has(item.story.id),
    bottomPadding: (bottomInset) => (typing ? lifted + KEYBOARD_GAP : bottomInset + 16),
    send,
    setTyping,
    edit: () => {
      "background only";
      setError(null);
    },
    measure: (height) => {
      "background only";
      if (height <= 0) return;
      setMeasured(height);
      onKeyboardHeight?.(height);
    },
    dismissKeyboard,
  };
}
