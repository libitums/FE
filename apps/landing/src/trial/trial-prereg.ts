// 사전 등록의 순수 함수 — 정규화 · 형식 · 요청 · 응답 해석 · 폼 상태 · env.

import type {
  IsValidEmail,
  NormalizeEmail,
  PreregOutcomeOf,
  PreregRequestOf,
  ReducePrereg,
  ResolvePreregConfig,
} from "./trial-prereg.contract";

/** DB 검사(`pre_registrations.email`)와 같은 꼴 — 공백 · @ 없는 앞, @, 점 하나 이상, 끝 두 글자 이상. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_MAX = 254;
/** 공개 키(옛 anon JWT · 새 publishable) 모양 — 공백 · 다른 글자가 끼면 붙여 넣기 실수다. */
const API_KEY = /^[A-Za-z0-9._-]{20,}$/;
const TABLE_PATH = "/rest/v1/pre_registrations";

export const normalizeEmail: NormalizeEmail = (raw) => raw.trim().toLowerCase();

export const isValidEmail: IsValidEmail = (normalized) =>
  normalized.length <= EMAIL_MAX && EMAIL.test(normalized);

/** `apikey` 머리만 — 새 publishable 키는 JWT가 아니라 Authorization Bearer로 보내면 게이트웨이가 거부합니다. */
export const preregRequestOf: PreregRequestOf = (config, email, locale) => ({
  url: config.endpoint,
  init: {
    method: "POST",
    headers: {
      apikey: config.apiKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ email, locale, source: "web-trial" }),
    credentials: "omit",
  },
});

/** 409(고유 email 충돌)는 남에게 등록 여부를 알리지 않게 화면에서 완료와 같습니다. */
export const preregOutcomeOf: PreregOutcomeOf = (status) => {
  if (status === "network") return "failed";
  if (status === 409) return "duplicate";
  return status >= 200 && status < 300 ? "submitted" : "failed";
};

export const reducePrereg: ReducePrereg = (status, event) => {
  if (status === "unavailable" || status === "done") return status;
  if (status === "sending") {
    if (event.type !== "result") return status;
    return event.outcome === "failed" ? "failed" : "done";
  }
  if (event.type !== "submit") return status;
  return event.valid ? "sending" : "invalid";
};

/** key 빈 값 + 비프로덕션 · url 빈 값 → null, key 빈 값 + 프로덕션 · 모양 틀림 → 던집니다(값은 메시지에 싣지 않음). */
export const resolvePreregConfig: ResolvePreregConfig = (url, key, production) => {
  const apiKey = (key ?? "").trim();
  if (apiKey === "") {
    if (production) {
      throw new Error(
        "PUBLIC_SUPABASE_ANON_KEY가 없습니다 — 프로덕션 체험판의 사전 등록은 공개 키가 필요합니다",
      );
    }
    return null;
  }
  if (!API_KEY.test(apiKey)) {
    throw new Error(
      "PUBLIC_SUPABASE_ANON_KEY 모양이 틀렸습니다(영문 · 숫자 · . _ - 20자 이상, 공백 없음)",
    );
  }
  const base = (url ?? "").trim().replace(/\/+$/, "");
  if (base === "") return null;
  return { endpoint: `${base}${TABLE_PATH}`, apiKey };
};
