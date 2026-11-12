// 상대 말 도착 낭독입니다(접근성 M1 — 4.1.3 Status Messages). 초점은 입력 줄에 있어 스크린리더 사용자는 로그를 다시 훑기
// 전까지 답이 왔는지 모릅니다. 이미 있던 줄 · 내가 보낸 줄 · 요청 중 자리(pending) · 입력 중 시작은 낭독하지 않습니다.

import { actionSpoken } from "./companion-parse";
import { useEffect, useRef } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";
import type { MessengerChatCopy } from "./messenger-chat.contract";
import { voiceDurationLabel } from "./chat-rules";
import type { ChatMessage } from "./chat-source.contract";

/** 말풍선 낭독과 같은 문장입니다. 낭독할 것이 없으면 null. */
export function arrivalAnnouncement(
  message: ChatMessage,
  name: string,
  copy: MessengerChatCopy["room"],
): string | null {
  switch (message.kind) {
    case "text":
      if (message.from === "me") return null;
      return message.text.en === ""
        ? `${name}: ${message.text.ko}`
        : `${name}: ${message.text.ko}, ${message.text.en}`;
    case "action":
      return actionSpoken(message.text, name);
    case "photo":
      return copy.photoLabel(name);
    case "voice":
      return copy.voiceLabel(
        name,
        voiceDurationLabel(message.durationMs),
        message.text.ko,
        message.text.en,
      );
    case "photo-pending":
    case "voice-pending":
    // 고지 줄은 로그를 훑을 때 읽힙니다. 위기 안내는 놓치면 안 되어 도착을 알립니다(ADR-0125).
    case "notice":
      return null;
    case "crisis":
      return copy.crisisArrived;
    default: {
      const unreachable: never = message;
      return unreachable;
    }
  }
}

/**
 * 대화 줄이 늘거나 요청 중 자리가 도착으로 바뀔 때 상대 쪽이면 한 번 낭독합니다. 처음 서는 대화는 낭독하지 않고,
 * `muted`(겹침이 열려 있을 때)에는 낭독을 생략합니다.
 */
export function useAnnounceArrivals(
  messages: readonly ChatMessage[] | null,
  name: string,
  copy: MessengerChatCopy["room"],
  muted: boolean,
  /** 서버 모드(ADR-0137) — 답이 조각마다 자라므로 턴이 끝난 뒤 다 자란 말을 한 번씩, 방을 열며 읽은 기록은 읽지 않습니다. */
  server: { readonly busy: boolean } | null = null,
): void {
  const seen = useRef<ReadonlyMap<string, ChatMessage["kind"]> | null>(null);
  const pending = useRef<string[]>([]);
  const wasBusy = useRef(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const busy = server?.busy ?? false;

  useEffect(() => {
    if (messages === null) return;
    const known = seen.current;
    seen.current = new Map(messages.map((message) => [message.id, message.kind]));
    if (known === null) return;
    const fresh = messages.filter((message) => known.get(message.id) !== message.kind);
    let toAnnounce = fresh;
    if (server !== null) {
      for (const message of fresh)
        if (!pending.current.includes(message.id)) pending.current.push(message.id);
      if (busy) {
        wasBusy.current = true;
        return;
      }
      const ids = wasBusy.current ? new Set(pending.current) : new Set<string>();
      pending.current = [];
      wasBusy.current = false;
      toAnnounce = messages.filter((message) => ids.has(message.id));
    }
    if (mutedRef.current) return;
    for (const message of toAnnounce) {
      const content = arrivalAnnouncement(message, name, copy);
      if (content !== null) announce(content);
    }
  }, [messages, name, copy, busy]);
}
