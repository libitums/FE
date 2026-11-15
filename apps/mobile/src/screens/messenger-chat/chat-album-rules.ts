// 앨범 · 다시 만들기 · 내 모습 묻기의 순수 규칙입니다(ADR-0150).

import type {
  ChatAlbumDay,
  ChatAlbumItem,
  ChatAlbumSection,
  ChatAlbumTab,
} from "./chat-album.contract";
import type { ChatMediaKind, ChatMessage, ChatPreferences } from "./chat-source.contract";

/** 탭 · 판 묶음 · 날짜 묶음. 최신부터. `remaking`은 다시 만드는 중인 메시지 id. `offsetMinutes`는 기기 시간대(UTC 기준 +분). */
export function albumSections(
  _items: readonly ChatAlbumItem[],
  _tab: ChatAlbumTab,
  _now: number,
  _offsetMinutes: number,
  _remaking: ReadonlySet<string>,
): readonly ChatAlbumSection[] {
  return [];
}

export function albumDayOf(_at: number, _now: number, _offsetMinutes: number): ChatAlbumDay {
  return { kind: "today" };
}

/** 다시 만들기 값 — 사진은 앞 그림이 있으면 25, 없으면 35. 음성은 15. */
export function remakePrice(_media: ChatMediaKind, _hasPrevious: boolean): number {
  return 0;
}

/** 가짜 출처 앨범 — 방 로그의 사진 · 음성 결과 줄(최신부터). */
export function albumItemsFromLog(_messages: readonly ChatMessage[]): readonly ChatAlbumItem[] {
  return [];
}

/** 첫 Snapshot 요청에서 내 모습을 물어야 하는가(M5). */
export function needsSelfAsk(_preferences: ChatPreferences, _media: ChatMediaKind): boolean {
  return false;
}
