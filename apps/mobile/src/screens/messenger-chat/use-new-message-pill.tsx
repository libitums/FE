// 「새 메시지 ↓」 알약의 상태 — 로그 자리(끝 근처 · 멂)를 받아, 떠나 있는 동안 온 상대 줄을 세고 알약 · ↓ 단추를 세웁니다.
// 끝을 떠나는 순간 로그의 상대 줄 id를 찍어 두고 그 뒤 온 줄만 셉니다. 누르면 jumpKey에 붙는 수를 올려 끝으로 내리고(움직임 줄이기면
// 점프 — ChatLog), 끝에 닿으면(내가 보내도 끝으로 감) 찍어 둔 것을 지웁니다.
// 안내의 무료 예시(ADR-0146 개정 ⟨예시 대상⟩): 예시 줄은 첫 인사 아래(로그 가운데)에 섭니다 — 끝으로 내리지도 「새 메시지」로 세지도
// 않고, 그 줄을 보입니다(끝을 보던 중 · 앞 예시가 옮겨 둔 채) 또는 「위에 도착 ↑」 알약을 세웁니다(위로 읽는 중, 결과가 왔을 때).

import { useCallback, useEffect, useMemo, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { ChatLogPosition, ChatLogReveal } from "../../components/chat/chat.contract";
import { useUiCopy } from "../../lib/ui-copy";
import { useChatEvents } from "./chat-events";
import { jumpKeyOf } from "./chat-jump-key";
import {
  isSampleLine,
  SAMPLE_PARK_MS,
  SAMPLE_REVEAL_SETTLE_MS,
  sampleLineOf,
  sampleRevealAction,
} from "./chat-sample-target";
import type { ChatMediaKind, ChatMessage, ChatThread } from "./chat-source.contract";
import { arrivalIds, arrivalsSince, noteArrivals, pillViewOf } from "./new-message-pill";
import { NewMessagePill as PillView } from "./NewMessagePill";

export type NewMessagePill = {
  /**
   * 대화 로그에 그대로 펼치는 값 — `jumpKey`는 내가 보낸 것(글 · 사진 · 음성 요청 · 다시 보내기, id 교체는 계기 아님 — 기기 F2)과
   * 알약 · ↓ 단추를 누른 수, `onPositionChange`는 로그 자리가 바뀔 때, `reveal`은 예시 줄을 보일 때.
   */
  readonly logProps: {
    readonly jumpKey: string;
    readonly onPositionChange: (position: ChatLogPosition) => void;
    readonly reveal?: ChatLogReveal;
  };
  readonly view: ReactNode;
};

const AT_END: ChatLogPosition = { nearEnd: true, far: false };
const NO_ORDER: ReadonlyMap<string, number> = new Map();
const NO_MESSAGES: readonly ChatMessage[] = [];

type AbovePill = { readonly id: string; readonly media: ChatMediaKind; readonly jump: string };

export function useNewMessagePill(roomId: string, thread: ChatThread | null): NewMessagePill {
  const copy = useUiCopy().messengerChat.newMessages;
  const { emit } = useChatEvents();
  const [position, setPosition] = useState<ChatLogPosition>(AT_END);
  const [seen, setSeen] = useState<ReadonlySet<string> | null>(null);
  const [jumps, setJumps] = useState(0);
  const all = thread?.messages ?? NO_MESSAGES;
  const samples = thread?.samples;
  // 예시 줄은 「새 메시지」로 세지 않습니다 — 그 줄은 따로 보입니다.
  const counted = useMemo(
    () => (samples === undefined ? all : all.filter((m) => !isSampleLine(m.id, samples))),
    [all, samples],
  );
  const messages = useRef(counted);
  messages.current = counted;

  // 앞 예시가 학습자를 그 줄로 옮겨 둔 때 — 그 뒤 학습자가 자리를 바꾸면(우리 스크롤이 자리 잡은 뒤의 알림) 지웁니다.
  const parkedAt = useRef<number | null>(null);
  const last = useRef<ChatLogPosition>(AT_END);
  // ref · 상태 설정 함수만 쓰므로 한 번 만든 것을 그대로 씁니다(로그의 효과가 매 렌더 다시 돌지 않게).
  const onPositionChange = useCallback((next: ChatLogPosition) => {
    "background only";
    if (last.current.nearEnd && !next.nearEnd) setSeen(arrivalIds(messages.current));
    if (next.nearEnd) setSeen(null);
    const parked = parkedAt.current;
    if (parked !== null && Date.now() - parked > SAMPLE_REVEAL_SETTLE_MS) parkedAt.current = null;
    last.current = next;
    setPosition(next);
  }, []);

  // 떠나 있는 동안 온 순서 — 사진 · 음성 줄은 로그 가운데에 끼어 서므로 마지막 종류는 온 순서로 정합니다.
  const [order, setOrder] = useState<ReadonlyMap<string, number>>(NO_ORDER);
  const shown = thread === null ? undefined : counted;
  useEffect(() => {
    if (seen === null || shown === undefined) setOrder(NO_ORDER);
    else setOrder((current) => noteArrivals(current, shown, seen));
  }, [shown, seen]);

  const base = jumpKeyOf(all, (id) => isSampleLine(id, samples));
  const [reveal, setReveal] = useState<ChatLogReveal | undefined>(undefined);
  const [above, setAbove] = useState<AbovePill | null>(null);
  const showLine = (lineId: string) => {
    parkedAt.current = Date.now();
    setReveal((current) => ({ lineId, key: (current?.key ?? 0) + 1 }));
    setAbove(null);
  };
  // 예시 줄이 서거나 바뀔 때만(방에 들어올 때 이미 있던 줄은 아님) — 그 줄을 보이거나 알약을 세웁니다.
  const sample = sampleLineOf(all, samples);
  const handled = useRef(sample?.id ?? null);
  useEffect(() => {
    if (sample === null || handled.current === sample.id) return;
    handled.current = sample.id;
    const parked = parkedAt.current;
    const action = sampleRevealAction({
      nearEnd: last.current.nearEnd,
      parked: parked !== null && Date.now() - parked < SAMPLE_PARK_MS,
      pending: sample.pending,
    });
    if (action === "scroll") showLine(sample.id);
    else if (action === "pill") setAbove({ id: sample.id, media: sample.media, jump: base });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample?.id]);

  const arrival = seen === null || thread === null ? null : arrivalsSince(counted, seen, order);
  // 「위에 도착」 알약은 그 줄이 그대로이고 그 뒤 내가 보내지 않았을 때만.
  const upward = above !== null && above.id === sample?.id && above.jump === base ? above : null;
  const view =
    upward === null
      ? pillViewOf({ nearEnd: position.nearEnd, far: position.far, arrival })
      : ({ kind: "above", media: upward.media } as const);
  const onJump = () => {
    "background only";
    if (upward !== null) return showLine(upward.id);
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
    logProps: {
      jumpKey: `${base}|${jumps}`,
      onPositionChange,
      ...(reveal === undefined ? {} : { reveal }),
    },
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
