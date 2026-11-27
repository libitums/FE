// 롤플레이 대화의 소리입니다 — 상대 줄 · 맞힌 뒤 내 문장 · 힌트의 「Hear it」. 한 번에 한 목소리(2026-11-27 제보): 새 소리는 앞 소리를
// 멈추고, 맞힌 뒤에는 내 문장 소리가 끝나야(최소 2초) 다음 턴(상대의 다음 줄 소리)으로 넘어갑니다.

import { playAudio, stopAudio } from "../../lib/audio";
import { useAudioCue } from "../../lib/use-audio-cue";
import type { CatalogRoleplayTurn } from "../catalog-final/catalog-final.contract";
import { useRoleplayAutoAdvance } from "./use-roleplay-auto-advance";

export type RoleplayVoices = {
  /** 지금 소리를 모두 멈춥니다 — 신호로 튼 소리와 힌트로 튼 소리 둘 다. */
  readonly stop: () => void;
  /** 힌트 「Hear it」 — 내 문장 소리. 틀었으면 `onHintListen`을 부릅니다. */
  readonly hear: () => void;
};

export function useRoleplayVoices(input: {
  readonly turnIndex: number;
  readonly turn: CatalogRoleplayTurn;
  readonly correct: boolean;
  /** 맞힌 뒤 저절로 넘기는가 — close(모범 정답을 읽을 차례)면 `false`라 Next를 기다립니다. */
  readonly autoAdvance: boolean;
  readonly done: boolean;
  /** 상대 줄 다시 듣기를 누른 수 — 바뀌면 상대 줄을 처음부터 다시 틉니다. */
  readonly replays: number;
  readonly advance: () => void;
  readonly onHintListen: () => void;
}): RoleplayVoices {
  const { turnIndex, turn, correct, done, replays } = input;
  const source = correct ? turn.replyAudioSource : turn.counterpartAudioSource;
  const audio = useAudioCue(
    source === undefined || done
      ? null
      : {
          key: `${String(turnIndex)}:${correct ? "reply" : String(replays)}`,
          source,
          ...(correct ? { onFinished: () => autoAdvance.replyEnded(turnIndex) } : {}),
        },
  );
  // 힌트의 「Hear it」은 신호 밖에서 트므로, 멈출 때는 신호 쪽과 호스트 쪽을 둘 다 멈춥니다.
  const stop = () => {
    "background only";
    audio.stop();
    stopAudio();
  };
  const autoAdvance = useRoleplayAutoAdvance({
    correct: correct && input.autoAdvance,
    turn: turnIndex,
    waitsForReply: turn.replyAudioSource !== undefined,
    advance: input.advance,
    onAway: stop,
  });
  const hear = () => {
    "background only";
    if (turn.replyAudioSource === undefined) return;
    audio.stop();
    if (playAudio(turn.replyAudioSource, () => {}) === "started") input.onHintListen();
  };
  return { stop, hear };
}
