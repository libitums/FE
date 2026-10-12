import "background-only";

// 콘텐츠 자리표시자 `{이름}` · `{나라}`를 학습자 프로필로 채우고 뒤 조사를 받침 규칙으로 고릅니다.
// 이 파일의 한글 리터럴은 아래 최상위 상수 셋에만 둡니다.

export type LearnerProfile = { name?: string; country?: string };

export const DEFAULT_PROFILE_TEXT = { name: "이름", country: "나라" } as const;

export const PLACEHOLDER_TOKENS = { name: "{이름}", country: "{나라}" } as const;

type ParticleRule = {
  marker: string;
  withFinal: string;
  withoutFinal: string;
  /** 받침이 ㄹ일 때의 형태 — 없으면 `withFinal`을 씁니다. */
  afterRieul?: string;
};

/** 토큰 바로 뒤에 붙은 조사 표기 → 받침 있음 · 없음 · ㄹ 형태. */
export const PARTICLE_RULES: { ko: readonly ParticleRule[]; roman: readonly ParticleRule[] } = {
  ko: [
    { marker: "(으)로", withFinal: "으로", withoutFinal: "로", afterRieul: "로" },
    { marker: "은/는", withFinal: "은", withoutFinal: "는" },
    { marker: "이/가", withFinal: "이", withoutFinal: "가" },
    { marker: "을/를", withFinal: "을", withoutFinal: "를" },
    { marker: "이에요", withFinal: "이에요", withoutFinal: "예요" },
  ],
  roman: [
    { marker: "(eu)ro", withFinal: "euro", withoutFinal: "ro", afterRieul: "ro" },
    { marker: "eun/neun", withFinal: "eun", withoutFinal: "neun" },
    { marker: "i/ga", withFinal: "i", withoutFinal: "ga" },
    { marker: "eul/reul", withFinal: "eul", withoutFinal: "reul" },
    { marker: "ieyo", withFinal: "ieyo", withoutFinal: "yeyo" },
  ],
};

const ROMAN_DEFAULTS = { name: "ireum", country: "nara" } as const;

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
const RIEUL_FINAL = 8;

type Ending = "final" | "open" | "rieul" | "unknown";

/** 마지막 글자로 받침을 판정합니다. 한글 음절과 라틴 글자 밖은 `unknown`. */
// 받침 판정에서 건너뛰는 끝 문자 — 라틴 문자 · 숫자 · 한글 음절이 아닌 것(문장 부호 · 공백 · 이모지).
const TRAILING_NON_WORD = /[^A-Za-z0-9\uAC00-\uD7A3]+$/;

function endingOf(text: string): Ending {
  const word = text.replace(TRAILING_NON_WORD, "");
  const last = word.length === 0 ? undefined : word.charAt(word.length - 1);
  if (last === undefined) {
    return "unknown";
  }
  const code = last.charCodeAt(0);
  if (code >= HANGUL_FIRST && code <= HANGUL_LAST) {
    const final = (code - HANGUL_FIRST) % 28;
    if (final === 0) {
      return "open";
    }
    return final === RIEUL_FINAL ? "rieul" : "final";
  }
  if (/[a-z]/i.test(last)) {
    return /[aeiouy]/i.test(last) ? "open" : "final";
  }
  return "unknown";
}

function pickForm(rule: ParticleRule, ending: Ending): string {
  if (ending === "open") {
    return rule.withoutFinal;
  }
  if (ending === "rieul") {
    return rule.afterRieul ?? rule.withFinal;
  }
  return rule.withFinal;
}

/** 토큰마다 쪼개 붙은 조사 표기를 고른 형태로 바꿉니다. */
function replaceToken(
  text: string,
  token: string,
  display: string,
  ending: Ending,
  rules: readonly ParticleRule[],
): string {
  const parts = text.split(token);
  let result = parts[0] ?? "";
  for (let i = 1; i < parts.length; i += 1) {
    const part = parts[i] ?? "";
    const rule = rules.find((candidate) => part.startsWith(candidate.marker));
    result +=
      rule === undefined
        ? display + part
        : display + pickForm(rule, ending) + part.slice(rule.marker.length);
  }
  return result;
}

export function fillPlaceholders(
  text: string,
  profile: LearnerProfile,
  script: "ko" | "roman",
): string {
  const rules = PARTICLE_RULES[script];
  const fields = ["name", "country"] as const;
  let result = text;
  for (const field of fields) {
    const value = (profile[field] ?? "").trim();
    const given = value.length > 0;
    const koText = given ? value : DEFAULT_PROFILE_TEXT[field];
    const display = given || script === "ko" ? koText : ROMAN_DEFAULTS[field];
    const own = endingOf(koText);
    const ending = own === "unknown" ? endingOf(DEFAULT_PROFILE_TEXT[field]) : own;
    result = replaceToken(result, PLACEHOLDER_TOKENS[field], display, ending, rules);
  }
  return result;
}
