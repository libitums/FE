import "background-only";

// 콘텐츠 자리표시자 `{이름}` · `{나라}`를 학습자 프로필로 채우고 뒤 조사를 받침 규칙으로 고릅니다.
// 이 파일의 한글 리터럴은 아래 최상위 상수 셋에만 둡니다.

/** 나라의 세 표기입니다 — 문장의 스크립트마다 하나씩 섭니다. `en`은 문장 안 꼴입니다(`the United States`). */
export type LearnerCountryText = {
  readonly ko: string;
  readonly roman: string;
  readonly en: string;
};

/** `country`가 문자열이면 세 스크립트에 같은 값이 섭니다. */
export type LearnerProfile = { name?: string; country?: string | LearnerCountryText };

export type FillScript = "ko" | "roman" | "en";

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

/** 모음 글자입니다 — 로마자 연음의 뒤따르는 글자 판정에 씁니다. */
const ROMAN_VOWEL = /[aeiouwy]/;

/** 연음에서 받침 소리가 다음 음절 첫소리로 넘어갈 때의 짝입니다. */
const LINKED_FINAL: Readonly<Record<string, string>> = { k: "g", t: "d", p: "b", l: "r" };

/** 나라의 로마자 끝에 뒤따르는 글자를 이어 읽습니다 — 모음이 오면 받침 글자가 바뀌고, `l` 뒤 `r`은 `ll`이 됩니다. */
function linkFinal(shown: string, tail: string): { shown: string; tail: string } {
  const last = shown.charAt(shown.length - 1);
  const next = tail.charAt(0);
  const linked = LINKED_FINAL[last];
  if (linked !== undefined && ROMAN_VOWEL.test(next)) {
    return { shown: shown.slice(0, -1) + linked, tail };
  }
  if (last === "l" && next === "r") {
    return { shown, tail: `l${tail.slice(1)}` };
  }
  return { shown, tail };
}

type Shown = {
  /** 토큰 자리에 서는 글자입니다. */
  display: string;
  /** 나라 객체의 로마자라서 뒤 글자와 연음하는가입니다. */
  links: boolean;
};

/** 스크립트에 맞는 표시값입니다. 값이 없으면 스크립트별 기본 문구입니다. */
function shownOf(
  field: "name" | "country",
  entered: LearnerProfile["country"],
  script: FillScript,
): Shown {
  const koValue = (typeof entered === "object" ? entered.ko : (entered ?? "")).trim();
  if (koValue.length === 0) {
    return {
      display: script === "ko" ? DEFAULT_PROFILE_TEXT[field] : ROMAN_DEFAULTS[field],
      links: false,
    };
  }
  if (typeof entered === "object") {
    return { display: entered[script].trim(), links: script === "roman" };
  }
  return { display: koValue, links: false };
}

/** 토큰마다 쪼개 붙은 조사 표기를 고른 형태로 바꿉니다. */
function replaceToken(
  text: string,
  token: string,
  shown: Shown,
  ending: Ending,
  rules: readonly ParticleRule[],
): string {
  const parts = text.split(token);
  let result = parts[0] ?? "";
  const joins = shown.links && (ending === "final" || ending === "rieul");
  for (let i = 1; i < parts.length; i += 1) {
    const part = parts[i] ?? "";
    const rule = rules.find((candidate) => part.startsWith(candidate.marker));
    const tail =
      rule === undefined ? part : pickForm(rule, ending) + part.slice(rule.marker.length);
    const linked = joins ? linkFinal(shown.display, tail) : { shown: shown.display, tail };
    result += linked.shown + linked.tail;
  }
  return result;
}

export function fillPlaceholders(
  text: string,
  profile: LearnerProfile,
  script: FillScript,
): string {
  const rules = PARTICLE_RULES[script === "ko" ? "ko" : "roman"];
  const fields = ["name", "country"] as const;
  let result = text;
  for (const field of fields) {
    const entered = profile[field];
    const koValue = (typeof entered === "object" ? entered.ko : (entered ?? "")).trim();
    const koText = koValue.length > 0 ? koValue : DEFAULT_PROFILE_TEXT[field];
    const own = endingOf(koText);
    const ending = own === "unknown" ? endingOf(DEFAULT_PROFILE_TEXT[field]) : own;
    result = replaceToken(
      result,
      PLACEHOLDER_TOKENS[field],
      shownOf(field, entered, script),
      ending,
      rules,
    );
  }
  return result;
}
