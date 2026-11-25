// 대화방의 친구 스토리 답장(ADR-0178 D5) — 보기가 남긴 넘김을 마운트 때 한 번 꺼내, 칩 말은 곧바로 인용과 함께 보내고 답장 칸이면
// 입력 줄 위 인용 띠로 붙여 다음 글에 싣습니다. 보낼 때 `friend_story_replied`가 납니다.
// 덕수쌤 스토리 퀴즈(시안 21 ~ 23, 서버 반영 예상)도 여기서 집니다 — 서버 방의 로그가 「다음 답 무료」(`quizFreeOf`)면 입력 줄 위 「Quiz answer
// is free」를 세우고, 그 답은 앱의 체험 · 엽전 관문을 지나지 않습니다(차감 판정은 서버 몫).

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useChatEvents } from "./chat-events";
import type { ChatSendOptions, ChatSource } from "./chat-source.contract";
import type { ChatStoryQuote } from "./friend-stories.contract";
import { takeStoryReplyHandoff } from "./story-reply-handoff";
import { quizFreeOf } from "./story-quiz";
import { QuizFreeStrip } from "./StoryQuizNotes";
import { StoryQuoteBar } from "./StoryQuote";

type Attached = { readonly quote: ChatStoryQuote; readonly free: boolean };

export type StoryReplyApi = {
  /**
   * 입력 줄 글의 관문 — 붙은 인용이 무료 안내면 앱의 체험 · 엽전 관문을 지나지 않고 `chat_message_sent`(무료)만 냅니다(정본은 서버, D6).
   * 답장 보기(아이디어)나 인용이 없으면 보통 관문(`gate`)입니다.
   */
  readonly authorize: (idea: boolean, gate: () => boolean) => boolean;
  /** 입력 줄의 글을 보낼 때 한 번 — 인용을 꺼내고 띠를 뗍니다. 붙은 것이 없으면 undefined. */
  readonly takeSendOptions: () => ChatSendOptions | undefined;
  readonly bar: (name: string) => ReactNode;
  /** 내 다음 글이 무료 퀴즈 답인가 — 보내기 단추를 엽전 없이 그립니다. */
  readonly quizFree: boolean;
};

/** `gate` = 보통 보내기 관문(체험 · 엽전 · 답 기다림). 무료가 아닌 칩 말도 이 관문을 거칩니다. */
export function useStoryReply(
  roomId: string,
  source: ChatSource,
  gate: () => boolean,
): StoryReplyApi {
  const { emit } = useChatEvents();
  const [handoff] = useState(() => takeStoryReplyHandoff(roomId));
  const [attached, setAttached] = useState<Attached | null>(() =>
    handoff !== null && handoff.text === null ? { quote: handoff.quote, free: handoff.free } : null,
  );
  const attachedRef = useRef(attached);
  attachedRef.current = attached;
  const replied = (via: "chip" | "typed", { quote, free }: Attached) =>
    emit({
      name: "friend_story_replied",
      surface: "chat",
      characterId: quote.characterId,
      via,
      free,
    });

  const freeSent = (characterId: string, storyFree = true) => {
    emit({
      name: "chat_message_sent",
      surface: "chat",
      characterId,
      paid: false,
      cost: "0",
      ...(storyFree ? { storyFree: true } : {}),
      fromSuggestion: false,
    });
    return true;
  };
  const thread = source.thread(roomId);
  const quiz = thread?.server == null ? null : quizFreeOf(thread.messages);

  // 칩 말 — 방이 선 뒤 한 번, 인용과 함께 보냅니다. 무료가 아니면 보통 관문(엽전이 모자라면 상점 안내)을 거칩니다.
  useEffect(() => {
    if (handoff === null || handoff.text === null) return;
    if (!(handoff.free ? freeSent(handoff.quote.characterId) : gate())) return;
    source.sendText(roomId, handoff.text, { story: handoff.quote });
    replied("chip", handoff);
  }, []);

  return {
    authorize: (idea, normal) => {
      const current = attachedRef.current;
      if (!idea && current?.free === true) return freeSent(current.quote.characterId);
      return quiz !== null && thread !== null ? freeSent(thread.counterpart.id, false) : normal();
    },
    takeSendOptions: () => {
      const current = attachedRef.current;
      if (current === null) return undefined;
      attachedRef.current = null;
      replied("typed", current);
      setAttached(null);
      return { story: current.quote };
    },
    bar: (name) => (
      <>
        {quiz === null ? null : <QuizFreeStrip />}
        {attached === null ? null : (
          <StoryQuoteBar quote={attached.quote} name={name} onRemove={() => setAttached(null)} />
        )}
      </>
    ),
    quizFree: quiz !== null,
  };
}
