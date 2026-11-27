// 안내의 무료 예시(ADR-0146 개정 ⟨예시 대상⟩)의 순수 규칙 — 대상 메시지 · 예시 줄 · 보여 주는 방법.
//
// 예시 사진 · 음성은 첫 인사에 맞춰 미리 만든 고정 파일입니다. 그래서 대상은 로그의 가장 최근 캐릭터 메시지(유료 규칙)가 아니라
// 그 방의 첫 인사(서버 `origin` greeting)이고, 모르면 그 방의 첫 캐릭터 메시지입니다 — 가이드 도중 답했어도 응답에 붙지 않습니다.
// 결과 줄은 첫 인사 아래에 서므로 화면 밖일 수 있습니다. 끝을 보던 학습자는 그 줄로 옮겨 보이고, 위로 읽는 중이면 알약으로 알립니다.

import type { ChatMediaTarget } from "./chat-media.contract";
import { bubbleOwner, mediaLineId, mediaLineKey, targetOfOwner } from "./chat-media-rules";
import type { ChatMediaKind, ChatMessage } from "./chat-source.contract";

/** 우리가 예시 줄로 옮긴 뒤 이만큼(ms) 안의 자리 알림은 우리 스크롤의 것입니다 — 그 뒤 알림이 오면 학습자가 옮긴 것으로 봅니다. */
export const SAMPLE_REVEAL_SETTLE_MS = 1_000;
/** 앞 예시가 옮겨 둔 자리를 이만큼(ms)까지만 「옮겨 둔 채」로 봅니다(사진 예시는 1.5초 뒤 도착, 이어지는 음성 예시 포함). */
export const SAMPLE_PARK_MS = 10_000;

/** 가장 최근 받은 예시의 사진 · 음성 줄 — 대기 줄이면 pending. */
export type SampleLine = {
  readonly id: string;
  readonly media: ChatMediaKind;
  readonly pending: boolean;
};

/** 예시 줄이 서거나 바뀔 때 — 그 줄로 옮겨 보임 · 「위에 도착」 알약 · 아무것도. */
export type SampleRevealAction = "scroll" | "pill" | "none";

/** 무료 예시의 대상 — 첫 인사, 없으면 첫 캐릭터 메시지. 음성인데 그 메시지에 말 조각이 없으면 null(예시 단계가 서지 않음). */
export function sampleTargetOf(
  messages: readonly ChatMessage[],
  media: ChatMediaKind,
  greetingId: string | null,
): ChatMediaTarget | null {
  let first: string | null = null;
  for (const message of messages) {
    const owner = bubbleOwner(message);
    if (owner !== null && owner === greetingId) return targetOfOwner(messages, owner, media);
    if (first === null) first = owner;
  }
  return first === null ? null : targetOfOwner(messages, first, media);
}

/** 예시 줄 id의 앞부분(`<대상>~<snapshot|voice>~`) — 대기 · 결과 · 회색 줄이 모두 이것으로 시작합니다. */
export function samplePrefixOf(targetId: string, media: ChatMediaKind): string {
  return mediaLineId(targetId, media, "");
}

export function isSampleLine(id: string, prefixes: readonly string[] | undefined): boolean {
  return prefixes !== undefined && prefixes.some((prefix) => id.startsWith(prefix));
}

/** 가장 최근 받은 예시(앞부분 목록의 마지막부터)의 사진 · 음성 줄 — 회색 줄은 건너뜁니다. 없으면 null. */
export function sampleLineOf(
  messages: readonly ChatMessage[],
  prefixes: readonly string[] | undefined,
): SampleLine | null {
  const list = prefixes ?? [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const prefix = list[i] as string;
    const line = messages.find(
      (message) => message.id.startsWith(prefix) && message.kind !== "media-notice",
    );
    const media = line === undefined ? undefined : mediaLineKey(line.id)?.media;
    if (line !== undefined && media !== undefined) {
      const pending = line.kind === "photo-pending" || line.kind === "voice-pending";
      return { id: line.id, media, pending };
    }
  }
  return null;
}

/**
 * 끝을 보고 있거나 앞 예시가 옮겨 둔 자리 그대로면 그 줄로 옮겨 보입니다. 위로 읽는 중이면 결과가 왔을 때만 알약을 세웁니다 —
 * 대기 줄로는 끌어가지도 알리지도 않습니다.
 */
export function sampleRevealAction(input: {
  readonly nearEnd: boolean;
  readonly parked: boolean;
  readonly pending: boolean;
}): SampleRevealAction {
  if (input.nearEnd || input.parked) return "scroll";
  return input.pending ? "none" : "pill";
}
