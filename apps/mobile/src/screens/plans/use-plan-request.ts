// Plans 화면의 계속 · 복원 요청(ADR-0144) — 한 번에 하나만 돌리고, 결과가 「아직 안 됨」 · 실패면 안내 한 줄을 세우고 낭독합니다.

import { useRef, useState } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";

/** 구매 · 복원 결과 중 사용자에게 알릴 것 — 다리가 꺼졌거나 실패면 안내, 성공 · 취소는 조용히. */
const needsNotice = (kind: string): boolean => kind === "unavailable" || kind === "failed";

export function usePlanRequest(unavailable: string): {
  readonly notice: string | null;
  readonly run: (task: () => Promise<{ readonly kind: string }>) => void;
} {
  const [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false);
  const show = (next: string | null) => {
    setNotice(next);
    // 안내는 화면 아래에 생기므로 낭독으로도 한 번 알립니다.
    if (next !== null) announce(next);
  };
  const run = (task: () => Promise<{ readonly kind: string }>) => {
    "background only";
    if (busy.current) return;
    // 탭 핸들러에서만 부릅니다(그리기 중이 아님) — 진행 중 표시는 다시 그릴 필요가 없어 ref입니다.
    // oxlint-disable-next-line react/immutability
    busy.current = true;
    void task()
      .then((result) => show(needsNotice(result.kind) ? unavailable : null))
      .catch(() => show(unavailable))
      .finally(() => {
        busy.current = false;
      });
  };
  return { notice, run };
}
