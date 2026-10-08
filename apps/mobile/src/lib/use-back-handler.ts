// 뒤로가기 핸들러 등록 훅입니다. 컴포넌트는 「보이는 닫기와 같은 함수」를 이 훅으로 스택에 올리고,
// 판정은 스택(`back-handler.ts`)이 합니다. 등록 · 해제는 effect에서 합니다 — 렌더 중에 스택을 건드리지 않습니다.

import { useEffect, useRef } from "@lynx-js/react";

import { backHandlers } from "./back-handler";
import type { BackHandler, BackHandlerEntry, BackHandlerLevel } from "./back-handler";

function useBackHandler(level: BackHandlerLevel, handler: BackHandler | null | undefined): void {
  // 자리는 그대로 두고 호출 대상만 최신으로 갑니다(use-opened-push.ts의 latest-ref와 같은 방식).
  const entry = useRef<BackHandlerEntry>({ current: () => {} });
  if (handler !== null && handler !== undefined) {
    entry.current.current = handler;
  }
  const registered = handler !== null && handler !== undefined;

  // 함수 ↔ 없음이 바뀔 때만 스택을 드나듭니다.
  useEffect(() => {
    if (!registered) return undefined;
    return backHandlers.add(level, entry.current);
  }, [level, registered]);
}

/** 화면의 「보이는 닫기」를 등록합니다. `null`·`undefined`면 등록하지 않습니다(닫기 수단이 없는 상태). */
export function useScreenBack(handler: BackHandler | null | undefined): void {
  useBackHandler("screen", handler);
}

/** 열려 있는 층의 닫기를 등록합니다. `null`·`undefined`면 등록하지 않습니다(층이 닫힌 상태). */
export function useLayerBack(handler: BackHandler | null | undefined): void {
  useBackHandler("layer", handler);
}
