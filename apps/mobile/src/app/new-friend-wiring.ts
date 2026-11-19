// 새 친구(인물 해금) 결선입니다(messenger-chat-1-5 spec §7.1). 해금 확정과 시트 모델만 다룹니다 — 순수 판정은
// `screens/messenger-chat/new-friend.ts`, 저장·출처 싱글턴은 `messenger-chat-wiring.ts`가 쥡니다.

import type { CatalogProgress } from "../lib/catalog-progress";
import { isCatalogEpisodeComplete } from "../lib/catalog-progress";
import { emitCompanionEvent } from "../lib/companion-events";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { COMPANION_CHARACTERS } from "../screens/messenger-chat/companion-roster";
import { CHARACTER_UNLOCKS, characterUnlockFor } from "../screens/messenger-chat/new-friend";
import type { MessengerAccess } from "../screens/messenger-chat/messenger-access";
import { localizedLine } from "../screens/messenger-chat/suggested-friends";
import type { NewFriendModel } from "../screens/messenger-chat/new-friend.contract";
import { currentMessengerChatSource, messengerUnlockStore } from "./messenger-chat-wiring";
import { rememberNewFriend } from "./new-friend-pending";
import type { ScreenWiring } from "./screen-wiring";

/**
 * 인물 해금(해금 JSON, ADR-0141): 에피소드를 끝냈으면(완료 조건 전부) 그 에피소드의 인물을 확정하고, 시트는 돌아온 맵이
 * 꺼내 띄우도록 기억만 합니다. 결과 화면 → 뒤 컷을 지나 맵으로 돌아올 때 부릅니다(`catalog-lesson-wiring.ts`).
 */
export function unlockFriendAfterEpisode(
  episodeId: string,
  sections: readonly CatalogMapSection[],
  progress: CatalogProgress,
  eventSink: EpisodeIntroEventSink = null,
): void {
  const section = sections.find((candidate) => candidate.episodeId === episodeId);
  if (section?.kind !== "catalog-ready") return;
  if (!isCatalogEpisodeComplete(progress, episodeId, section.completionKeys)) return;
  const characterId = commitNewFriend(episodeId, "episode", eventSink);
  if (characterId !== null) rememberNewFriend(characterId);
}

/**
 * 에피소드를 끝내고 뒤 컷을 지난 순간(`unlockFriendAfterEpisode`) · 진도 보정(`use-new-friend-backfill`)이 부릅니다. 이 에피소드가
 * 새 인물을 해금하면 기록(영속)과 대화 출처에 **바로** 알리고 그 id를 돌려줍니다 — 맵의 시트를 보기 전에 앱을 떠나도 목록에
 * NEW 줄이 남고, 다시 끝내도 시트는 다시 안 뜹니다. 해금할 인물이 없거나 이미 열었으면 null.
 */
export function commitNewFriend(
  episodeId: string,
  source: "episode" | "backfill" = "episode",
  eventSink: EpisodeIntroEventSink = null,
): string | null {
  const store = messengerUnlockStore();
  const entry = characterUnlockFor({ episodeId, unlocked: store.read() });
  if (entry === null) return null;
  store.add(entry.characterId);
  currentMessengerChatSource()?.unlockCharacter(entry.characterId);
  const characterId = entry.characterId;
  emitCompanionEvent(eventSink, {
    name: "companion_unlocked",
    surface: "learning",
    characterId,
    episodeId,
    source,
  });
  return entry.characterId;
}

type ModelWiring = Pick<ScreenWiring, "messengerChat" | "catalogSections" | "episodeContent">;

/**
 * 시트 모델입니다. 이름 · 얼굴 · 첫 메시지 · 회차 · 제목 중 하나라도 없으면 null(시트 없음 — 해금은 이미 됨).
 * 메신저를 쓸 수 없는 계정(`access`가 open이 아님 — 손님 · 시험 계정이 아닌 회원, ADR-0128)도 null입니다 — Reply가 열 방이 없고
 * 안내 화면만 탭 바 없이 쌓였습니다. 해금 기록은 그대로라 메신저가 열리면 목록에 NEW 줄로 섭니다.
 */
export function newFriendModelOf(
  characterId: string,
  wiring: ModelWiring,
  access: MessengerAccess,
  /** 화면 문구의 언어(`suggested.language`) — 인물 표로 서는 뜻풀이 칸을 고릅니다. */
  language: string,
): NewFriendModel | null {
  if (access === "sign-in") return null; // 비회원 미리보기(ADR-0166)는 회원과 같은 목록이라 Reply가 열 방이 있습니다
  const entry = CHARACTER_UNLOCKS.find((candidate) => candidate.characterId === characterId);
  if (entry === undefined) return null;
  const thread = wiring.messengerChat.source.thread(entry.roomId);
  // 서버 방(ADR-0137)은 열기 전엔 비어 있어 인물 표의 첫 말로 시트를 세웁니다. 뜻풀이는 화면 언어 칸입니다(서버가 저장한 첫 말은
  // 서버가 학습자 언어로 번역해 붙입니다 — 2026-11-19 l10n 점검 전에는 표의 영어가 늘 섰습니다).
  const fromRoster = COMPANION_CHARACTERS.find((c) => c.id === characterId)?.sheetOpening ?? null;
  const rosterText =
    fromRoster === null ? null : { ko: fromRoster.ko, en: localizedLine(fromRoster, language) };
  const opening =
    thread?.messages.find((message) => message.kind === "text" && message.from === "them") ??
    (rosterText === null
      ? undefined
      : ({ id: "sheet", at: 0, kind: "text", from: "them", text: rosterText } as const));
  const section = wiring.catalogSections.find(
    (candidate) => candidate.kind === "catalog-ready" && candidate.episodeId === entry.episodeId,
  );
  if (
    thread === null ||
    opening === undefined ||
    opening.kind !== "text" ||
    section === undefined ||
    section.kind !== "catalog-ready"
  ) {
    return null;
  }
  // 그림은 부를 때의 최신 해석기로 풉니다 — 첫 렌더에서 콘텐츠가 아직 안 읽힌 해석기를 쥐지 않습니다.
  const imageUrlOf = wiring.episodeContent.imageUrlOf;
  return {
    characterId,
    roomId: entry.roomId,
    name: thread.counterpart.name,
    faceUrl: thread.counterpart.avatarUrl ?? imageUrlOf(entry.faceImagePath),
    sceneUrl: imageUrlOf(entry.sceneImagePath),
    episodeOrdinal: section.ordinal,
    episodeTitle: section.titleEn ?? section.title,
    opening: opening.text,
  };
}
