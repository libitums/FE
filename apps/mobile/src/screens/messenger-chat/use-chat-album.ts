// 앨범 화면의 데이터 훅입니다(ADR-0150) — 첫 쪽 · 다음 쪽 · 다시 읽기 · 다시 만들기와 「Drawing…」 표시.
// 출처 호출은 모두 effect · 누름 처리(background)에서만 합니다. 화면을 떠난 뒤 온 응답은 버립니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import type { ChatAlbumItem, ChatRemakeResult } from "./chat-album.contract";
import { remakeKey } from "./chat-album-rules";
import type { ChatSource } from "./chat-source.contract";

export type ChatAlbumState =
  | { readonly status: "loading" }
  | { readonly status: "failed" }
  | {
      readonly status: "ready";
      readonly items: readonly ChatAlbumItem[];
      readonly hasMore: boolean;
      readonly loadingMore: boolean;
    };

export type ChatAlbumApi = {
  readonly state: ChatAlbumState;
  /** 다시 만드는 중인 `remakeKey`들. */
  readonly remaking: ReadonlySet<string>;
  readonly retry: () => void;
  readonly more: () => void;
  readonly remake: (item: ChatAlbumItem) => Promise<ChatRemakeResult>;
};

const pendingIn = (source: ChatSource, roomId: string): boolean =>
  (source.thread(roomId)?.messages ?? []).some(
    (message) => message.kind === "photo-pending" || message.kind === "voice-pending",
  );

export function useChatAlbum(source: ChatSource, roomId: string): ChatAlbumApi {
  const [state, setState] = useState<ChatAlbumState>({ status: "loading" });
  const [remaking, setRemaking] = useState<ReadonlySet<string>>(new Set());
  const generation = useRef(0);
  const mounted = useRef(true);
  const remakingRef = useRef(remaking);
  remakingRef.current = remaking;

  const reload = () => {
    generation.current += 1;
    const gen = generation.current;
    void source.album.load(roomId, null).then((page) => {
      if (!mounted.current || gen !== generation.current) return;
      setState(
        page === null
          ? { status: "failed" }
          : { status: "ready", items: page.items, hasMore: page.hasMore, loadingMore: false },
      );
    });
  };

  useEffect(() => {
    mounted.current = true;
    reload();
    return () => {
      mounted.current = false;
    };
  }, [source, roomId]);

  // 다시 만들기가 끝나면(방 로그에 자리표시자가 남지 않으면) 표시를 걷고 다시 읽습니다 — 새 판이 앨범에 섭니다.
  useEffect(
    () =>
      source.subscribe(() => {
        if (remakingRef.current.size === 0 || pendingIn(source, roomId)) return;
        setRemaking(new Set());
        reload();
      }),
    [source, roomId],
  );

  return {
    state,
    remaking,
    retry: () => {
      setState({ status: "loading" });
      reload();
    },
    more: () => {
      if (state.status !== "ready" || !state.hasMore || state.loadingMore) return;
      const oldest = state.items.reduce((at, item) => Math.min(at, item.createdAt), Infinity);
      const gen = generation.current;
      setState({ ...state, loadingMore: true });
      void source.album.load(roomId, Number.isFinite(oldest) ? oldest : null).then((page) => {
        if (!mounted.current || gen !== generation.current) return;
        setState(
          page === null
            ? { ...state, loadingMore: false }
            : {
                status: "ready",
                items: [...state.items, ...page.items],
                hasMore: page.hasMore,
                loadingMore: false,
              },
        );
      });
    },
    remake: async (item) => {
      const result = await source.album.remake(roomId, item);
      if (mounted.current && result.kind === "started")
        setRemaking((keys) => new Set([...keys, remakeKey(item.messageId, item.kind)]));
      return result;
    },
  };
}
