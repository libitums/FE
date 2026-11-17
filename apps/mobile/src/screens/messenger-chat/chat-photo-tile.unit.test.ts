import { describe, expect, test } from "vitest";

import { chatPhotoTile } from "./chat-album-rules";
import { mediaLineId } from "./chat-media-rules";
import {
  chatRoomReducer,
  initialChatRoomState,
  openPhotoAction,
  overlayParent,
} from "./chat-room-state";
import type { ChatMessage } from "./chat-source.contract";

// `unit` 계층(CV-U1 ~ U5): 채팅방 사진 말풍선 → 사진 보기(ADR-0150 2026-11-17 추가). 방 로그의 사진 줄로 앨범과 같은 칸을 만들고,
// 다시 그리기 확인 · 엽전 상점은 닫으면 방으로 돌아간다(앨범과 같음).

const A1 = "22222222-2222-4222-8222-222222222222";
const M1 = "33333333-3333-4333-8333-333333333333";
const M2 = "44444444-4444-4444-8444-444444444444";

const target: ChatMessage = {
  id: `${A1}#0`,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko: "궁 마당이에요!", en: "It's the palace yard!" },
};
const photo = (media: string, at: number, url: string | null = `https://signed/${media}`) =>
  ({
    id: mediaLineId(A1, "photo", media),
    at,
    kind: "photo",
    imageUrl: url,
    aspect: "3:2",
    aiGenerated: true,
  }) as const satisfies ChatMessage;

describe("chatPhotoTile", () => {
  test("CV-U1 다 만든 사진 줄 → 앨범과 같은 칸(그때의 말 · 대상 메시지 · 서버 결과 id)", () => {
    const tile = chatPhotoTile([target, photo(M1, 2)], mediaLineId(A1, "photo", M1));
    expect(tile).not.toBeNull();
    expect(tile?.item).toMatchObject({
      id: M1,
      messageId: A1,
      kind: "photo",
      url: `https://signed/${M1}`,
      aspect: "3:2",
      line: { ko: "궁 마당이에요!", en: "It's the palace yard!" },
      fromPastChat: false,
    });
    expect(tile?.versions.map((v) => v.id)).toEqual([M1]);
    expect(tile?.remaking).toBe(false);
  });

  test("CV-U2 그림이 없거나(서명 URL 없음) 사진 줄이 아니거나 없는 id면 칸이 없다", () => {
    expect(chatPhotoTile([target, photo(M1, 2, null)], mediaLineId(A1, "photo", M1))).toBeNull();
    expect(chatPhotoTile([target], target.id)).toBeNull();
    expect(chatPhotoTile([target], "nope")).toBeNull();
  });

  test("CV-U3 같은 메시지의 판들은 오래된 것부터, 칸은 최신 · 다시 그리는 중이면 remaking", () => {
    const pending: ChatMessage = {
      id: mediaLineId(A1, "photo", "req"),
      at: 4,
      kind: "photo-pending",
    };
    const tile = chatPhotoTile(
      [target, photo(M2, 3), photo(M1, 2), pending],
      mediaLineId(A1, "photo", M1),
    );
    expect(tile?.versions.map((v) => v.id)).toEqual([M1, M2]);
    expect(tile?.item.id).toBe(M2);
    expect(tile?.remaking).toBe(true);
  });
});

test("CV-U4 다시 그리기 확인 · 그 엽전 상점은 닫으면 방(겹침 없음)으로 돌아간다", () => {
  expect(overlayParent({ kind: "photo", messageId: "m" })).toEqual({ kind: "none" });
  expect(overlayParent({ kind: "photo-redraw", messageId: "m" })).toEqual({ kind: "none" });
  expect(overlayParent({ kind: "coin-shop", from: "photo" })).toEqual({ kind: "none" });
});

test("CV-U5 사진 보기를 열면 키보드 자리 · 보기 판을 접는다(낭독 누름처럼 로그 누름이 없어도)", () => {
  const open = {
    ...initialChatRoomState({ initial: "learning", toggle: "shown" }),
    slot: { kind: "ideas", picked: null },
  } as const;
  const next = chatRoomReducer(open, openPhotoAction("m"));
  expect(next.overlay).toEqual({ kind: "photo", messageId: "m" });
  expect(next.slot).toEqual({ kind: "closed" });
  expect(next.phoneFocus).toBe("blurred");
});
