// 채팅 새 기능 모달의 결선(ADR-0140) — 인물 줄을 위해 대화 출처를 **이 모달이 떠 있는 동안만** 구독합니다. 세션 루트에서
// 구독하면 답이 스트리밍되는 동안 조각마다 루트 전체가 다시 그려집니다(2026-11-14 안정성 리뷰 2).

import type { ReactNode } from "@lynx-js/react";
import { useEffect } from "@lynx-js/react";

import { emitCompanionEvent } from "../lib/companion-events";

import { COMPANION_CHARACTERS } from "../screens/messenger-chat/companion-roster";
import { useChatSnapshot } from "../screens/messenger-chat/use-chat-source";
import { ChatIntroModal } from "../screens/launch/LaunchModals";
import type { LaunchCastMember } from "../screens/launch/launch.contract";
import type { ScreenWiring } from "./screen-wiring";

export function LaunchChatStep({
  wiring,
  onLater,
  onBack,
  onStart,
}: {
  readonly wiring: ScreenWiring;
  readonly onLater: () => void;
  readonly onBack: () => void;
  readonly onStart: () => void;
}): ReactNode {
  const snapshot = useChatSnapshot(wiring.messengerChat.source);
  const cast: readonly LaunchCastMember[] = COMPANION_CHARACTERS.map((character) => {
    const room = snapshot.rooms.find((r) => r.roomId === character.id);
    return {
      name: character.name,
      // 그림이 없으면 빈 얼굴(launch-face-blank) — 빈 경로를 해석기에 넘기지 않습니다(리뷰 #430).
      avatarUrl:
        room?.counterpart.avatarUrl ??
        (character.avatarPath === null
          ? null
          : wiring.episodeContent.imageUrlOf(character.avatarPath)),
      met: room === undefined ? character.unlockEpisode === null : room.access.kind === "open",
      episode: character.unlockEpisode,
    };
  });
  const met = cast.filter((person) => person.met).length;
  // 모달이 설 때 한 번(제품 이벤트 — 효과에서 보냄).
  useEffect(() => {
    emitCompanionEvent(wiring.messengerChat.eventSink, {
      name: "launch_chat_shown",
      surface: "learning",
      met: String(met),
      total: String(cast.length),
    });
  }, []);
  return <ChatIntroModal cast={cast} onLater={onLater} onBack={onBack} onStart={onStart} />;
}
