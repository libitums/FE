// 문자 막간 메신저의 순수 함수입니다(ADR-0088 보충) — 진행 계산 · 기다리는 시간 · 표시 모델.

import { EPISODE_SELF_SPEAKER } from "@libitums/episode-core/lines";

import type { EpisodeChat, EpisodeChatTurn, Text } from "../../lib/episode-content.model";
import type { FillScript } from "../../lib/placeholder-fill";
import type {
  StoryChatLogItem,
  StoryChatProgress,
  StoryChatText,
  StoryChatTurn,
  StoryChatView,
} from "./story-messenger.contract";

// 다음에 보일 줄 — 고른 답과 다른 분기 줄은 건너뜁니다.
function nextIndex(turns: readonly StoryChatTurn[], from: number, pick: number): number {
  let i = from;
  for (;;) {
    const turn = turns[i];
    if (turn === undefined || turn.kind !== "message") return i;
    if (turn.afterOption === null || turn.afterOption === pick) return i;
    i += 1;
  }
}

/** 보인 메시지 `shown`개와 고른 답(1부터) `picks`로 지금 화면을 계산합니다. */
export function storyChatProgressOf(
  turns: readonly StoryChatTurn[],
  shown: number,
  picks: readonly number[],
): StoryChatProgress {
  const log: StoryChatLogItem[] = [];
  let pos = 0;
  let pick = 0;
  let picked = 0;
  let count = 0;
  for (;;) {
    pos = nextIndex(turns, pos, pick);
    const turn = turns[pos];
    if (turn === undefined) return { log, next: null, awaiting: null };
    if (turn.kind === "reply") {
      const choice = picks[picked];
      const option = choice === undefined ? undefined : turn.options[choice - 1];
      if (choice === undefined || option === undefined) return { log, next: null, awaiting: turn };
      pick = choice;
      picked += 1;
      log.push({
        id: `${pos}:${choice}`,
        direction: "outgoing",
        speaker: "",
        text: option,
        imageUrl: null,
      });
      pos += 1;
      continue;
    }
    if (count >= shown) return { log, next: turn, awaiting: null };
    log.push({
      id: `${pos}`,
      direction: turn.self ? "outgoing" : "incoming",
      speaker: turn.speaker,
      text: turn.text,
      imageUrl: turn.imageUrl,
    });
    count += 1;
    pos += 1;
  }
}

/** 방금 뜬 말을 읽을 틈 — 이 동안은 입력 중 표시도 없습니다. */
export function storyChatReadPauseMs(chars: number): number {
  return Math.min(3000, 1200 + 60 * Math.min(chars, 20));
}

/** 입력 중(…)이 보이는 시간입니다. */
export function storyChatTypingMs(chars: number): number {
  return Math.min(2400, 900 + 45 * chars);
}

/** 답장 차례에 상대의 마지막 말을 읽을 시간 — 그 뒤에 시트가 섭니다. */
export function storyChatSheetDelayMs(chars: number): number {
  return Math.min(4000, 2000 + 70 * chars);
}

export type StoryChatPort = {
  readonly imageUrlOf: (relativePath: string) => string | null;
  readonly fill: (text: string, script: FillScript) => string;
};

function textOf(text: Text, port: StoryChatPort): StoryChatText {
  return {
    ko: port.fill(text.ko, "ko"),
    en: text.en === undefined ? "" : port.fill(text.en, "en"),
  };
}

function turnOf(turn: EpisodeChatTurn, port: StoryChatPort): StoryChatTurn {
  if (turn.kind === "reply") {
    const [first, ...rest] = turn.options.map((option) => textOf(option, port));
    return { kind: "reply", options: [first as StoryChatText, ...rest] };
  }
  return {
    kind: "message",
    self: turn.speaker === EPISODE_SELF_SPEAKER,
    speaker: turn.speaker,
    text: textOf(turn.line, port),
    imageUrl: turn.imageUrl === undefined ? null : port.imageUrlOf(turn.imageUrl),
    afterOption: turn.afterOption ?? null,
  };
}

/** 도메인 대화 → 표시 모델. 그림 주소는 해석하고 글은 채웁니다. */
export function storyChatViewOf(chat: EpisodeChat, port: StoryChatPort): StoryChatView {
  const [first, ...rest] = chat.turns.map((turn) => turnOf(turn, port));
  return {
    counterpart: chat.counterpart,
    counterpartAvatarUrl:
      chat.counterpartImageUrl === undefined ? null : port.imageUrlOf(chat.counterpartImageUrl),
    turns: [first as StoryChatTurn, ...rest],
  };
}
