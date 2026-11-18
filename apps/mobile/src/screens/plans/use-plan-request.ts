// Plans 화면의 계속 · 복원 요청(ADR-0144) — 한 번에 하나만 돌리고, 결과가 「아직 안 됨」 · 실패면 안내 한 줄을 세우고 낭독합니다.
// 도는 동안은 어느 요청인지(`pending`)를 그림 상태로 올려 두 단추를 막고 누른 단추에 로딩을 보입니다(2단계 — 실제 결제 시트가 뜨는 동안).

import { useRef, useState } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";

export type PlanRequestKind = "purchase" | "restore";

/** 구매 · 복원 결과 중 사용자에게 알릴 것 — 다리가 꺼졌거나 실패면 안내, 성공 · 취소는 조용히. */
const needsNotice = (kind: string): boolean => kind === "unavailable" || kind === "failed";

export function usePlanRequest(unavailable: string): {
  readonly notice: string | null;
  readonly pending: PlanRequestKind | null;
  readonly run: (kind: PlanRequestKind, task: () => Promise<{ readonly kind: string }>) => void;
} {
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PlanRequestKind | null>(null);
  // 같은 프레임의 두 번 누름도 막도록 ref로도 듭니다(상태는 다음 그리기에 반영됨).
  const busy = useRef(false);
  const show = (next: string | null) => {
    setNotice(next);
    // 안내는 화면 아래에 생기므로 낭독으로도 한 번 알립니다.
    if (next !== null) announce(next);
  };
  const run = (kind: PlanRequestKind, task: () => Promise<{ readonly kind: string }>) => {
    "background only";
    if (busy.current) return;
    // 탭 핸들러에서만 부릅니다(그리기 중이 아님).
    // oxlint-disable-next-line react/immutability
    busy.current = true;
    setPending(kind);
    setNotice(null);
    void task()
      .then((result) => show(needsNotice(result.kind) ? unavailable : null))
      .catch(() => show(unavailable))
      .finally(() => {
        busy.current = false;
        setPending(null);
      });
  };
  return { notice, pending, run };
}
