import { useState } from "@lynx-js/react";

import type { SocialLoginMethod } from "./login.contract";

// 사용 불가 수단 안내의 화면 로컬 상태입니다(ADR-0111 개정 2 · 3 — 목록은 결선이 정책 · 플랫폼으로 만들어 넘긴다). 탭은 요청 중이면 무시하고,
// 사용 불가 수단이면 `select`를 부르지 않고 안내만 세웁니다. 「Google로 계속」은 닫고 google 탭과 같은 길입니다.
export function useLoginUnavailable(
  unavailableMethods: readonly SocialLoginMethod[],
  busy: boolean,
  select: (method: SocialLoginMethod) => void,
): {
  readonly notice: SocialLoginMethod | null;
  readonly close: () => void;
  readonly tap: (method: SocialLoginMethod) => void;
  readonly onAction: (id: string) => void;
} {
  const [notice, setNotice] = useState<SocialLoginMethod | null>(null);
  const close = () => setNotice(null);
  function tap(method: SocialLoginMethod) {
    if (busy) return;
    if (unavailableMethods.includes(method)) {
      setNotice(method);
      return;
    }
    select(method);
  }
  function onAction(id: string) {
    close();
    // Google 버튼을 직접 누른 것과 같은 경로 — Google이 사용 불가 목록에 들면(제품값에선 없음) 안내가 다시 선다.
    if (id === "use-google") tap("google");
  }
  return { notice, close, tap, onAction };
}
