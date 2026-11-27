// 가짜 출처의 법 · 안전 조각입니다(ADR-0125) — 씨앗의 입력 막힘을 시각으로 풀고, 생년 갱신을 판정합니다. 순수 함수만 둡니다.

import { MINUTE_MS } from "./chat-fixture-room";
import type {
  ChatBirthYear,
  ChatFixtureMessage,
  ChatFixtureRoom,
  ChatInputBlock,
  ChatMessage,
} from "./chat-source.contract";

/** 씨앗에 생년이 없을 때의 값입니다. */
export const UNASKED: ChatBirthYear = { kind: "unasked" };

/** 씨앗의 고지 · 위기 줄을 메시지로 풉니다. */
export function safetyMessageOf(
  message: Extract<ChatFixtureMessage, { kind: "notice" | "crisis" }>,
  id: string,
  at: number,
): ChatMessage {
  return message.kind === "notice"
    ? { id, at, kind: "notice", notice: message.notice }
    : { id, at, kind: "crisis", resources: message.resources };
}

/** 씨앗의 「지금부터 몇 분 뒤」를 시각으로 풉니다. 없으면 null입니다. */
export function inputBlockOf(room: ChatFixtureRoom, now: number): ChatInputBlock | null {
  const block = room.inputBlock;
  if (block === undefined) return null;
  switch (block.kind) {
    case "temporarily-blocked":
      return { kind: block.kind, until: now + block.inMinutes * MINUTE_MS };
    case "usage-time-limit":
      return { kind: block.kind, resetsAt: now + block.inMinutes * MINUTE_MS };
    case "age-restricted":
      return { kind: block.kind };
  }
}

/** `setBirthYear`의 다음 값입니다. 바뀌지 않으면(같은 값 · 정수가 아닌 연도) 지금 값을 그대로 돌려줍니다. */
export function nextBirthYear(current: ChatBirthYear, year: number | null): ChatBirthYear {
  if (year === null) return current.kind === "skipped" ? current : { kind: "skipped" };
  if (!Number.isInteger(year)) return current;
  if (current.kind === "set" && current.year === year) return current;
  return { kind: "set", year };
}

export type SeedMessageDeps = {
  readonly now: () => number;
  readonly messageId: () => string;
  /** 사진 줄마다 자기 경로(계약 밖) — 그림 해석기를 갈아 끼우면 다시 풉니다. */
  readonly photoPaths: Map<string, string | null>;
  readonly resolveUrl: (path: string | null) => string | null;
};

/** 씨앗 메시지 하나를 출처 메시지로 풉니다(시각 · id를 지금 정합니다). 고지 · 위기도 여기서 만듭니다. */
export function seedMessageReader(
  deps: SeedMessageDeps,
): (message: ChatFixtureMessage) => ChatMessage {
  return (message) => {
    const at = deps.now() - message.minutesAgo * MINUTE_MS;
    const id = deps.messageId();
    switch (message.kind) {
      case "text":
        return { id, at, kind: "text", from: message.from, text: message.text };
      case "photo":
        deps.photoPaths.set(id, message.imagePath);
        return { id, at, kind: "photo", imageUrl: deps.resolveUrl(message.imagePath) };
      case "voice":
        return { id, at, kind: "voice", durationMs: message.durationMs, text: message.text };
      case "notice":
      case "crisis":
        return safetyMessageOf(message, id, at);
    }
  };
}
