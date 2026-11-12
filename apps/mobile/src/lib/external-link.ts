// 위기 안내 카드의 전화 · 웹 주소를 호스트 `ExternalLinkModule`로 엽니다(ADR-0125). 열 수 있는 주소(`tel:` 번호 ·
// `https`)만 넘기고, **어떤 경우에도 던지지 않습니다** — 모듈이 없거나 실패하면 false입니다.

import { isOpenableExternalUrl } from "../screens/messenger-chat/safety-rules";

export function openExternalLink(url: string): boolean {
  if (!isOpenableExternalUrl(url)) return false;
  try {
    // `NativeModules`가 없거나 `null`인 경우는 `storage.ts`의 가드와 같은 이유입니다.
    if (typeof NativeModules === "undefined" || NativeModules === null) return false;
    const module = (NativeModules as Record<string, unknown>)["ExternalLinkModule"] as
      | { open?: unknown }
      | null
      | undefined;
    const open = module?.open;
    if (typeof open !== "function") return false;
    // 결과 콜백은 쓰지 않습니다 — 열지 못해도 카드의 번호 · 주소 글자가 그대로 보입니다.
    (open as (url: string, callback: (result: unknown) => void) => void).call(
      module,
      url,
      () => {},
    );
    return true;
  } catch {
    return false;
  }
}
