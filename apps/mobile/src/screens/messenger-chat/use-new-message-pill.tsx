// 「새 메시지 ↓」 알약의 상태 — 로그 자리(끝 근처 · 멂)를 받아, 떠나 있는 동안 온 상대 줄을 세고 알약 · ↓ 단추를 세웁니다.
// 끝을 떠나는 순간 로그의 상대 줄 id를 찍어 두고 그 뒤 온 줄만 셉니다. 누르면 jumpKey에 붙는 수를 올려 끝으로 내리고(움직임 줄이기면
// 점프 — ChatLog), 끝에 닿으면(내가 보내도 끝으로 감) 찍어 둔 것을 지웁니다.

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { ChatLogPosition } from "../../components/chat/chat.contract";
import { useUiCopy } from "../../lib/ui-copy";
import { useChatEvents } from "./chat-events";
import { jumpKeyOf } from "./chat-jump-key";
import type { ChatThread } from "./chat-source.contract";
import { arrivalIds, arrivalsSince, noteArrivals, pillViewOf } from "./new-message-pill";
import { NewMessagePill as PillView } from "./NewMessagePill";

export type NewMessagePill = {
  /**
   * 대화 로그에 그대로 펼치는 값 — `jumpKey`는 내가 보낸 것(글 · 사진 · 음성 요청 · 다시 보내기, id 교체는 계기 아님 — 기기 F2)과
   * 알약 · ↓ 단추를 누른 수, `onPositionChange`는 로그 자리가 바뀔 때.
   */
  readonly logProps: {
    readonly jumpKey: string;
    readonly onPositionChange: (position: ChatLogPosition) => void;
  };
  readonly view: ReactNode;
};

const AT_END: ChatLogPosition = { nearEnd: true, far: false };
const NO_ORDER: ReadonlyMap<string, number> = new Map();

export function useNewMessagePill(roomId: string, thread: ChatThread | null): NewMessagePill {
  const copy = useUiCopy().messengerChat.newMessages;
  const { emit } = useChatEvents();
  const [position, setPosition] = useState<ChatLogPosition>(AT_END);
  const [seen, setSeen] = useState<ReadonlySet<string> | null>(null);
  const [jumps, setJumps] = useState(0);
  const messages = useRef(thread?.messages ?? []);
  messages.current = thread?.messages ?? [];

  const last = useRef<ChatLogPosition>(AT_END);
  const onPositionChange = (next: ChatLogPosition) => {
    "background only";
    if (last.current.nearEnd && !next.nearEnd) setSeen(arrivalIds(messages.current));
    if (next.nearEnd) setSeen(null);
    last.current = next;
    setPosition(next);
  };

  // 떠나 있는 동안 온 순서 — 사진 · 음성 줄은 로그 가운데에 끼어 서므로 마지막 종류는 온 순서로 정합니다.
  const [order, setOrder] = useState<ReadonlyMap<string, number>>(NO_ORDER);
  const shown = thread?.messages;
  useEffect(() => {
    if (seen === null || shown === undefined) setOrder(NO_ORDER);
    else setOrder((current) => noteArrivals(current, shown, seen));
  }, [shown, seen]);

  const arrival =
    seen === null || thread === null ? null : arrivalsSince(thread.messages, seen, order);
  const view = pillViewOf({ nearEnd: position.nearEnd, far: position.far, arrival });
  const onJump = () => {
    "background only";
    if (view?.kind === "pill") {
      emit({
        name: "chat_new_messages_jumped",
        surface: "chat",
        characterId: roomId,
        count: String(view.arrival.count),
        media: view.arrival.latest,
      });
    }
    setJumps((count) => count + 1);
  };

  return {
    logProps: { jumpKey: `${jumpKeyOf(thread?.messages ?? [])}|${jumps}`, onPositionChange },
    view:
      thread === null ? null : (
        <PillView
          view={view}
          avatar={{ name: thread.counterpart.name, imageUrl: thread.counterpart.avatarUrl }}
          copy={copy}
          onJump={onJump}
        />
      ),
  };
}
