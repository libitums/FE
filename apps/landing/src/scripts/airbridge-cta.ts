// Android 카드 클릭과 추적 시작을 DOM · 전역에 잇는 접착 코드입니다.

import { startsTrackingIn } from "../analytics/airbridge";
import type { InitAirbridgeCta, InitAirbridgeTracking } from "../analytics/airbridge.contract";

export const initAirbridgeCta: InitAirbridgeCta = ({ root, sdkOf, deeplink }) => {
  const links = root.querySelectorAll<HTMLAnchorElement>('a[data-store="android"]');
  for (const link of links) {
    link.addEventListener("click", (event) => {
      // 새 탭 · 새 창으로 열려는 클릭(보조 버튼 · 수정키)은 브라우저 기본 동작에 맡깁니다.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const sdk = sdkOf();
      if (!sdk) return;
      event.preventDefault();
      sdk.openDeeplink(deeplink);
    });
  }
  return links.length;
};

export const initAirbridgeTracking: InitAirbridgeTracking = ({ airbridge, timeZone }) => {
  if (!startsTrackingIn(timeZone)) return false;
  airbridge?.startTracking?.();
  return true;
};
