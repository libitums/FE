// 자동 푸시 캠페인 — 나라 → 시간대 · 문구 언어(콘솔 segments.mjs · story.mjs와 같은 표)입니다.

/** 나라 → 대표 시간대입니다(콘솔 segments.mjs와 같은 표). */
export const COUNTRY_TIME_ZONES: Record<string, string> = {
  AE: "Asia/Dubai",
  AF: "Asia/Kabul",
  AL: "Europe/Tirane",
  AR: "America/Argentina/Buenos_Aires",
  AT: "Europe/Vienna",
  AU: "Australia/Sydney",
  BD: "Asia/Dhaka",
  BR: "America/Sao_Paulo",
  CA: "America/Toronto",
  CL: "America/Santiago",
  CN: "Asia/Shanghai",
  CO: "America/Bogota",
  DE: "Europe/Berlin",
  DZ: "Africa/Algiers",
  EG: "Africa/Cairo",
  ES: "Europe/Madrid",
  FR: "Europe/Paris",
  GB: "Europe/London",
  HK: "Asia/Hong_Kong",
  ID: "Asia/Jakarta",
  IN: "Asia/Kolkata",
  IT: "Europe/Rome",
  JP: "Asia/Tokyo",
  KE: "Africa/Nairobi",
  KH: "Asia/Phnom_Penh",
  KR: "Asia/Seoul",
  LK: "Asia/Colombo",
  MM: "Asia/Yangon",
  MX: "America/Mexico_City",
  MY: "Asia/Kuala_Lumpur",
  NG: "Africa/Lagos",
  NP: "Asia/Kathmandu",
  PE: "America/Lima",
  PH: "Asia/Manila",
  PK: "Asia/Karachi",
  RU: "Europe/Moscow",
  SA: "Asia/Riyadh",
  SG: "Asia/Singapore",
  TH: "Asia/Bangkok",
  TR: "Europe/Istanbul",
  TW: "Asia/Taipei",
  US: "America/New_York",
  UZ: "Asia/Tashkent",
  VN: "Asia/Ho_Chi_Minh",
};

export const timeZoneFor = (country: string | null): string | null =>
  (country && COUNTRY_TIME_ZONES[country.toUpperCase()]) || null;

/** 그 시간대의 지금 시(0~23)입니다. */
export function localHourOf(nowMs: number, timeZone: string): number {
  const text = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date(nowMs));
  return Number(text);
}

const SPANISH = new Set("AR BO CL CO CR CU DO EC ES GT HN MX NI PA PE PR PY SV UY VE".split(" "));

/** 나라 → 콘솔 문구 언어(en · vi · id · ms · es · ja)입니다. */
export function copyLanguageFor(country: string | null): string {
  const code = (country ?? "").toUpperCase();
  if (code === "VN") return "vi";
  if (code === "ID") return "id";
  if (code === "MY") return "ms";
  if (code === "JP") return "ja";
  if (SPANISH.has(code)) return "es";
  return "en";
}

/** 나라 → 예고 문구 언어입니다. 말레이시아는 예고에 말레이어가 없어 인도네시아어, `my`는 미얀마어(D11). */
export function storyLanguageFor(country: string | null): string {
  const code = (country ?? "").toUpperCase();
  if (code === "VN") return "vi";
  if (code === "ID" || code === "MY") return "id";
  if (code === "JP") return "ja";
  if (code === "TH") return "th";
  if (code === "MM") return "my";
  if (SPANISH.has(code)) return "es";
  return "en";
}
