// 체험판을 연 브라우저의 분류입니다(순수). User-Agent 글만 보고, 원문은 어디에도 싣지 않습니다.
// 인앱 브라우저도 Safari · Chrome 글을 품으므로 인앱을 먼저 봅니다.

import type { TrialBrowserOf } from "./trial-events.contract";

/** 카카오톡 · 인스타그램 · 페이스북 · 네이버 · 라인 · 안드로이드 웹뷰. */
const IN_APP = /KAKAOTALK|Instagram|FBAN|FBAV|FB_IAB|NAVER\(inapp|Line\/|; wv\)/;
const IOS = /iPhone|iPad|iPod/;
const IOS_OTHER = /CriOS|FxiOS|EdgiOS|OPiOS/;
const ANDROID_OTHER = /SamsungBrowser|EdgA|OPR|Firefox/;
const MOBILE = /Mobi|Android|iPhone|iPad|iPod/;

export const trialBrowserOf: TrialBrowserOf = (userAgent) => {
  if (IN_APP.test(userAgent)) return "in-app";
  if (IOS.test(userAgent)) {
    return /Safari\//.test(userAgent) && !IOS_OTHER.test(userAgent) ? "ios-safari" : "other";
  }
  if (/Android/.test(userAgent) && /Chrome\//.test(userAgent) && !ANDROID_OTHER.test(userAgent)) {
    return "android-chrome";
  }
  return MOBILE.test(userAgent) ? "other" : "desktop";
};
