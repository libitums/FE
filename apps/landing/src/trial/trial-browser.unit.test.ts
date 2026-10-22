import { describe, expect, it } from "vitest";

import type { TrialBrowser } from "../scripts/analytics.contract";
import { trialBrowserOf } from "./trial-browser";

// `unit` 계층: User-Agent → 브라우저 분류(순수). 인앱을 먼저 본다(인앱도 Safari · Chrome 글을 품는다).

const UA: readonly (readonly [string, string, TrialBrowser])[] = [
  [
    "iPhone Safari",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "ios-safari",
  ],
  [
    "iPad Safari",
    "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "ios-safari",
  ],
  [
    "iOS Chrome",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.46 Mobile/15E148 Safari/604.1",
    "other",
  ],
  [
    "Android Chrome",
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
    "android-chrome",
  ],
  [
    "Samsung Internet",
    "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
    "other",
  ],
  [
    "Android WebView",
    "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36",
    "in-app",
  ],
  [
    "KakaoTalk iOS",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.9.0",
    "in-app",
  ],
  [
    "KakaoTalk Android",
    "Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36;KAKAOTALK 2410900",
    "in-app",
  ],
  [
    "Instagram",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0.0 (iPhone15,2; iOS 18_0; ko_KR)",
    "in-app",
  ],
  [
    "Facebook",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.0;FBBV/1]",
    "in-app",
  ],
  [
    "NAVER",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.8.0; 15)",
    "in-app",
  ],
  [
    "LINE",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.16.0",
    "in-app",
  ],
  [
    "Mac Safari",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    "desktop",
  ],
  [
    "Windows Chrome",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "desktop",
  ],
  [
    "Android Firefox",
    "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
    "other",
  ],
  ["빈 문자열", "", "desktop"],
];

describe("BR1 trialBrowserOf", () => {
  it.each(UA)("%s → %s", (_name, userAgent, browser) => {
    expect(trialBrowserOf(userAgent)).toBe(browser);
  });
});
