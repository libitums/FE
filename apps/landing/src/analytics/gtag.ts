// GA4(gtag.js) 연결에 쓰는 순수 함수입니다. 측정 ID가 없으면 페이지는 아무것도 싣지 않습니다.

const measurementIdPattern = /^G-[A-Z0-9]{4,}$/;

/**
 * 동의 배너 없이 가기 위해 분석 쿠키를 기본으로 끄는 지역입니다 — EU 27개국, EEA(아이슬란드 ·
 * 리히텐슈타인 · 노르웨이), 영국, 스위스. 이 지역에서는 쿠키 없는 신호만 나갑니다.
 */
export const consentDeniedRegions: readonly string[] = [
  ...["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE"],
  ...["IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"],
  ...["IS", "LI", "NO", "GB", "CH"],
];

/** `PUBLIC_GA_MEASUREMENT_ID`의 원문을 측정 ID 또는 `""`로 바꿉니다. 모양이 틀리면 던집니다. */
export function resolveMeasurementId(env: string | undefined): string {
  const candidate = (env ?? "").trim();
  if (candidate === "") return "";
  if (!measurementIdPattern.test(candidate)) {
    throw new Error(
      `PUBLIC_GA_MEASUREMENT_ID must be a GA4 measurement ID (for example G-AB12CD34EF), but got "${candidate}".`,
    );
  }
  return candidate;
}

const adsDenied = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
} as const;

/**
 * gtag.js보다 먼저 실행할 초기화 스크립트의 본문입니다. 동의 기본값을 config보다 앞에 둡니다 —
 * 지역이 붙은 기본값이 그 지역에서 우선하고, 그 밖의 지역에는 둘째 기본값이 적용됩니다.
 */
export function buildGtagBootstrap(measurementId: string): string {
  if (!measurementIdPattern.test(measurementId)) {
    throw new Error(`buildGtagBootstrap: "${measurementId}" is not a GA4 measurement ID.`);
  }
  const denied = { ...adsDenied, analytics_storage: "denied", region: consentDeniedRegions };
  const granted = { ...adsDenied, analytics_storage: "granted" };
  return [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}",
    `gtag("consent","default",${JSON.stringify(denied)});`,
    `gtag("consent","default",${JSON.stringify(granted)});`,
    'gtag("js",new Date());',
    `gtag("config",${JSON.stringify(measurementId)});`,
  ].join("");
}
