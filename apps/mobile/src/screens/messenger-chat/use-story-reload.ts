// 친구 스토리 다시 읽기(ADR-0178 「다시 읽기」) — 앱이 앞으로 옴(포트 신호) · 목록이 서 있는 동안 5분마다 다시 읽습니다. 보기가 열려 있으면
// 받은 목록을 보류했다가 닫은 뒤 반영하고, 못 읽으면 있던 목록을 지킵니다. 탭을 오가거나 방에서 돌아오면 목록이 다시 마운트돼 마운트 읽기가 맡습니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { STORY_RELOAD_MS, storiesAfterLoad } from "./friend-stories";
import type { FriendStoriesPort, FriendStory } from "./friend-stories.contract";

type Stories = readonly FriendStory[] | null;

export type StoryReload = {
  /** 다른 읽기(마운트 · 알림)가 반영됐다 — 보류한 옛 결과를 버립니다. */
  readonly dropHeld: () => void;
};

export function useStoryReload({
  port,
  viewerOpen,
  setStories,
}: {
  readonly port: FriendStoriesPort | undefined;
  readonly viewerOpen: boolean;
  readonly setStories: (update: (previous: Stories) => Stories) => void;
}): StoryReload {
  const [reloadVersion, setReloadVersion] = useState(0);
  const held = useRef<Stories>(null);
  const open = useRef(viewerOpen);
  open.current = viewerOpen;
  // 포트 객체가 렌더마다 같아도 그때의 함수를 씁니다(마운트 읽기와 같은 꼴).
  const loadRef = useRef(port?.load ?? null);
  loadRef.current = port?.load ?? null;
  const subscribeRef = useRef(port?.subscribeReload ?? null);
  subscribeRef.current = port?.subscribeReload ?? null;
  const hasLoader = loadRef.current !== null;

  useEffect(() => {
    if (!hasLoader) return undefined;
    const bump = () => setReloadVersion((version) => version + 1);
    const handle = setInterval(bump, STORY_RELOAD_MS);
    const off = subscribeRef.current?.(bump);
    return () => {
      clearInterval(handle);
      off?.();
    };
  }, [hasLoader]);

  useEffect(() => {
    const load = loadRef.current;
    if (reloadVersion === 0 || load === null) return undefined;
    let live = true;
    void load()
      .catch(() => null)
      .then((list) => {
        if (!live) return;
        if (open.current) held.current = storiesAfterLoad(held.current, list);
        else setStories((previous) => storiesAfterLoad(previous, list));
      });
    return () => {
      live = false;
    };
  }, [reloadVersion]);

  useEffect(() => {
    const next = held.current;
    if (viewerOpen || next === null) return;
    held.current = null;
    setStories(() => next);
  }, [viewerOpen]);

  return {
    dropHeld: () => {
      held.current = null;
    },
  };
}
