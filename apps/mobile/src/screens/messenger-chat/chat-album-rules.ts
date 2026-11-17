// 앨범 · 다시 만들기 · 내 모습 묻기의 순수 규칙입니다(ADR-0150).
//
// 격자 한 칸 = 사진은 메시지 하나(판들은 최신이 칸, 나머지는 판 고르기), 음성은 결과 하나. 날짜는 기기 시간대로 가릅니다.

import type {
  ChatAlbumDay,
  ChatAlbumItem,
  ChatAlbumSection,
  ChatAlbumTab,
  ChatAlbumTile,
} from "./chat-album.contract";
import { mediaLineKey, mediaTargetOf } from "./chat-media-rules";
import type { ChatMediaKind, ChatMessage, ChatPreferences } from "./chat-source.contract";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
/** 다시 만들기 값(서버 `photo_redraw_cost` · `photo_cost` · `voice_cost`와 같게). */
const PRICES = { redraw: 25, photo: 35, voice: 15 } as const;

/** 다시 만드는 중 표시의 키입니다(메시지 · 종류). */
export const remakeKey = (messageId: string, media: ChatMediaKind): string =>
  `${messageId}~${media}`;

const localDay = (at: number, offsetMinutes: number) =>
  Math.floor((at + offsetMinutes * MINUTE_MS) / DAY_MS);

export function albumDayOf(at: number, now: number, offsetMinutes: number): ChatAlbumDay {
  const day = localDay(at, offsetMinutes);
  const today = localDay(now, offsetMinutes);
  if (day === today) return { kind: "today" };
  if (day === today - 1) return { kind: "yesterday" };
  const date = new Date(day * DAY_MS);
  return { kind: "date", month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

const inTab = (item: ChatAlbumItem, tab: ChatAlbumTab) =>
  tab === "all" || (tab === "photos" ? item.kind === "photo" : item.kind === "voice");

const sameDay = (a: ChatAlbumDay, b: ChatAlbumDay) =>
  a.kind === b.kind &&
  (a.kind !== "date" || (b.kind === "date" && a.month === b.month && a.day === b.day));

/** 탭 · 판 묶음 · 날짜 묶음. 최신부터. `remaking`은 `remakeKey`들. `offsetMinutes`는 기기 시간대(UTC 기준 +분). */
export function albumSections(
  items: readonly ChatAlbumItem[],
  tab: ChatAlbumTab,
  now: number,
  offsetMinutes: number,
  remaking: ReadonlySet<string>,
): readonly ChatAlbumSection[] {
  const newest = [...items]
    .filter((item) => inTab(item, tab))
    .sort((a, b) => b.createdAt - a.createdAt);
  const tiles: ChatAlbumTile[] = [];
  const photoTiles = new Map<string, ChatAlbumItem[]>();
  for (const item of newest) {
    if (item.kind === "photo") {
      const versions = photoTiles.get(item.messageId);
      if (versions !== undefined) {
        versions.unshift(item);
        continue;
      }
      photoTiles.set(item.messageId, [item]);
    }
    tiles.push({
      item,
      versions: item.kind === "photo" ? (photoTiles.get(item.messageId) ?? [item]) : [item],
      remaking: remaking.has(remakeKey(item.messageId, item.kind)),
    });
  }
  const sections: { day: ChatAlbumDay; tiles: ChatAlbumTile[] }[] = [];
  for (const tile of tiles) {
    const day = albumDayOf(tile.item.createdAt, now, offsetMinutes);
    const last = sections[sections.length - 1];
    if (last !== undefined && sameDay(last.day, day)) last.tiles.push(tile);
    else sections.push({ day, tiles: [tile] });
  }
  return sections;
}

/** 다시 만들기 값 — 사진은 앞 그림이 있으면 25, 없으면 35. 음성은 15. */
export function remakePrice(media: ChatMediaKind, hasPrevious: boolean): number {
  if (media === "voice") return PRICES.voice;
  return hasPrevious ? PRICES.redraw : PRICES.photo;
}

const NO_LINE = { ko: "", en: "" } as const;

/** 가짜 출처 앨범 — 방 로그의 사진 · 음성 결과 줄(최신부터). 서버 줄(`<대상>~종류~<id>`)은 대상 메시지 · 그 말을 씁니다. */
export function albumItemsFromLog(messages: readonly ChatMessage[]): readonly ChatAlbumItem[] {
  const items: ChatAlbumItem[] = [];
  for (const message of messages) {
    if (message.kind !== "photo" && message.kind !== "voice") continue;
    const key = mediaLineKey(message.id);
    const target =
      key === null
        ? null
        : mediaTargetOf(
            messages.filter((m) => m.id.startsWith(`${key.targetId}#`)),
            "photo",
          );
    const line = message.kind === "voice" ? message.text : (target?.text ?? NO_LINE);
    items.push({
      id: key?.suffix ?? message.id,
      messageId: key?.targetId ?? message.id,
      kind: message.kind,
      url: message.kind === "photo" ? message.imageUrl : (message.audioUrl ?? null),
      aspect: message.kind === "photo" ? (message.aspect ?? null) : null,
      line,
      createdAt: message.at,
      fromPastChat: false,
    });
  }
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 채팅방 사진 줄 → 사진 보기 칸입니다(2026-11-17 — 방에서 사진을 누르면 앨범과 같은 사진 보기). 같은 메시지의 판은 오래된 것부터,
 * 칸은 최신입니다. 그 메시지를 다시 그리는 중(방에 자리표시자)이면 remaking. 그림이 없거나(서명 URL 없음) 사진 줄이 아니면 null.
 */
export function chatPhotoTile(
  messages: readonly ChatMessage[],
  photoId: string,
): ChatAlbumTile | null {
  const line = messages.find((message) => message.id === photoId);
  if (line?.kind !== "photo" || line.imageUrl === null) return null;
  const id = mediaLineKey(photoId)?.suffix ?? photoId;
  const photos = albumItemsFromLog(messages).filter((item) => item.kind === "photo");
  const tapped = photos.find((item) => item.id === id);
  if (tapped === undefined) return null;
  const versions = photos
    .filter((item) => item.messageId === tapped.messageId)
    .sort((a, b) => a.createdAt - b.createdAt);
  const remaking = messages.some(
    (message) =>
      message.kind === "photo-pending" && mediaLineKey(message.id)?.targetId === tapped.messageId,
  );
  return { item: versions[versions.length - 1] ?? tapped, versions, remaking };
}

/** 첫 Snapshot 요청에서 내 모습을 물어야 하는가(M5) — 고른 적 없고 사진일 때. */
export function needsSelfAsk(preferences: ChatPreferences, media: ChatMediaKind): boolean {
  return media === "photo" && preferences.snapshotSelf === null;
}
