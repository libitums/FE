// 브라우저에서 쓰는 순수 함수입니다. 로더 스니펫(`airbridge-loader.ts`)을 import하지 않습니다.

import { ANDROID_JOURNEY_DEEPLINK } from "./airbridge.contract";
import type {
  AirbridgeDeeplinkOptionsOf,
  AirbridgeSdk,
  AirbridgeSdkOf,
  StartsTrackingIn,
} from "./airbridge.contract";

/** 지금 보는 랜딩 페이지 주소(쿼리 · 조각 없음)를 desktop · iOS 폴백으로 쓰는 딥링크 옵션입니다. */
export const airbridgeDeeplinkOptionsOf: AirbridgeDeeplinkOptionsOf = ({ origin, pathname }) => {
  const landing = origin + pathname;
  return {
    type: "click",
    deeplinks: {
      android: ANDROID_JOURNEY_DEEPLINK,
      ios: ANDROID_JOURNEY_DEEPLINK,
      desktop: landing,
    },
    fallbacks: { android: "google-play", ios: landing },
  };
};

const euAtlanticZones: ReadonlySet<string> = new Set([
  "Atlantic/Reykjavik",
  "Atlantic/Canary",
  "Atlantic/Madeira",
  "Atlantic/Faroe",
]);

/** `Europe/*`와 EEA 대서양 영토에서는 추적을 시작하지 않습니다. 시간대를 모르면 시작합니다. */
export const startsTrackingIn: StartsTrackingIn = (timeZone) => {
  if (timeZone === undefined) return true;
  return !(timeZone.startsWith("Europe/") || euAtlanticZones.has(timeZone));
};

/** 로드가 끝난 SDK만 돌려줍니다. 스텁 · 없음 · 차단은 null입니다. */
export const airbridgeSdkOf: AirbridgeSdkOf = (candidate) => {
  if (typeof candidate !== "object" || candidate === null) return null;
  const sdk = candidate as { isSDKEnabled?: unknown; openDeeplink?: unknown };
  if (sdk.isSDKEnabled !== true || typeof sdk.openDeeplink !== "function") return null;
  return candidate as AirbridgeSdk;
};
