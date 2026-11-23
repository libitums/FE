// 한글 자모표의 학습 콘텐츠입니다(ADR-0169) — 40자 · 개정 로마자(보드 값) · 누르면 나는 소리 · 소리 파일 id.
// 한글은 화면 문구가 아니라 배우는 내용이라 UI 언어를 따르지 않습니다(ui-copy-literals 학습 콘텐츠 선언).
// 순수 · import 없음 — 두 스레드에 실려도 됩니다. 문자열 메서드는 Android PrimJS에 있는 것만 씁니다(indexOf · charCodeAt).

export type JamoGroupId = "consonants" | "vowels" | "doubles" | "combined";

export type JamoLetter = {
  readonly letter: string;
  readonly roman: string;
};

export type JamoGroup = {
  readonly id: JamoGroupId;
  readonly letters: readonly JamoLetter[];
};

const letters = (pairs: string): readonly JamoLetter[] =>
  pairs.split(",").map((pair) => {
    const [letter = "", roman = ""] = pair.split("=");
    return { letter, roman };
  });

/** 보드 순서 그대로입니다 — 기본 자음 14 · 기본 모음 10 · 쌍자음 5 · 겹모음 11. */
export const JAMO_GROUPS: readonly JamoGroup[] = [
  {
    id: "consonants",
    letters: letters(
      "ㄱ=g / k,ㄴ=n,ㄷ=d / t,ㄹ=r / l,ㅁ=m,ㅂ=b / p,ㅅ=s,ㅇ=silent / ng,ㅈ=j,ㅊ=ch,ㅋ=k,ㅌ=t,ㅍ=p,ㅎ=h",
    ),
  },
  { id: "vowels", letters: letters("ㅏ=a,ㅑ=ya,ㅓ=eo,ㅕ=yeo,ㅗ=o,ㅛ=yo,ㅜ=u,ㅠ=yu,ㅡ=eu,ㅣ=i") },
  { id: "doubles", letters: letters("ㄲ=kk,ㄸ=tt,ㅃ=pp,ㅆ=ss,ㅉ=jj") },
  {
    id: "combined",
    letters: letters("ㅐ=ae,ㅒ=yae,ㅔ=e,ㅖ=ye,ㅘ=wa,ㅙ=wae,ㅚ=oe,ㅝ=wo,ㅞ=we,ㅟ=wi,ㅢ=ui"),
  },
];

// 유니코드 음절 조합 순서의 초성 19 · 중성 21과 그 로마자(소리 파일 이름 · 퀴즈 타일).
const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const INITIAL_ROMAN = "g,kk,n,d,tt,r,m,b,pp,s,ss,,j,jj,ch,k,t,p,h".split(",");
const MEDIALS = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const MEDIAL_ROMAN = "a,ae,ya,yae,eo,e,yeo,ye,o,wa,wae,oe,yo,u,wo,we,wi,yu,eu,ui,i".split(",");
const SYLLABLE_BASE = 0xac00;
const SILENT = 11; // ㅇ
const A = 0; // ㅏ
/** 퀴즈 음절(너 · 도)도 소리 파일이 있습니다 — 「자음 + ㅏ」 · 「ㅇ + 모음」 밖의 둘. */
const QUIZ_SOUNDS: readonly (readonly [number, number])[] = [
  [2, 4],
  [3, 8],
];

export function isJamoConsonant(letter: string): boolean {
  return letter.length === 1 && INITIALS.indexOf(letter) >= 0;
}

/** 자음 + 모음 → 음절. 자음 · 모음이 아니면 빈 문자열. */
export function composeSyllable(consonant: string, vowel: string): string {
  const initial = consonant.length === 1 ? INITIALS.indexOf(consonant) : -1;
  const medial = vowel.length === 1 ? MEDIALS.indexOf(vowel) : -1;
  if (initial < 0 || medial < 0) return "";
  return String.fromCharCode(SYLLABLE_BASE + (initial * 21 + medial) * 28);
}

/** 누르면 나는 소리 — 자음은 ㅏ를 붙인 소리(가 · 나 …), 모음은 ㅇ을 앞에 둔 소리(아 · 야 …). */
export function jamoSoundOf(letter: string): string {
  if (isJamoConsonant(letter)) return composeSyllable(letter, "ㅏ");
  return composeSyllable("ㅇ", letter);
}

/**
 * 자모 칸을 누르면 나는 앱 내장 녹음의 이름입니다(ADR-0173 ⟨2026-11-23⟩). 녹음은 자음 18개 `c-<로마자>-sound` · 모음 21개
 * `v-<로마자>`이고 호스트 음성 폴더(`apps/ios/Host/audio/`, Android는 같은 폴더를 복사 — ADR-0045)에 `hangul-` 이름으로
 * 실었습니다. ㅇ은 녹음이 없어 지금처럼 「아」(ㅏ)를 냅니다. 자모가 아니면 null. 합치기 퀴즈 음절은 `letterAudioIdOf`입니다.
 */
export function jamoClipOf(letter: string): string | null {
  if (letter.length !== 1) return null;
  const initial = INITIALS.indexOf(letter);
  if (initial === SILENT) return "hangul-v-a";
  // 표가 어긋나 로마자가 비면 반쪽 이름을 만들지 않고 null — 칸은 「소리 없음」으로 섭니다.
  const consonant = initial >= 0 ? INITIAL_ROMAN[initial] : undefined;
  if (consonant !== undefined && consonant !== "") return `hangul-c-${consonant}-sound`;
  const medial = MEDIALS.indexOf(letter);
  const vowel = medial >= 0 ? MEDIAL_ROMAN[medial] : undefined;
  return vowel !== undefined && vowel !== "" ? `hangul-v-${vowel}` : null;
}

/** 받침 없는 음절의 (초성, 중성) 번호. 아니면 null. */
function partsOf(syllable: string): readonly [number, number] | null {
  if (syllable.length !== 1) return null;
  const offset = syllable.charCodeAt(0) - SYLLABLE_BASE;
  if (offset < 0 || offset >= 19 * 21 * 28 || offset % 28 !== 0) return null;
  return [Math.floor(offset / (21 * 28)), (offset / 28) % 21];
}

/** 이 음절이 소리 파일을 가진 소리인가 — 자모표 소리 39개와 퀴즈 둘. */
function hasLetterSound(initial: number, medial: number): boolean {
  if (medial === A || initial === SILENT) return true;
  return QUIZ_SOUNDS.some(([i, m]) => i === initial && m === medial);
}

/** 소리 파일 id(`letters/<로마자>`, 버킷 `audio/letters/<로마자>.m4a`). 소리 파일이 없는 음절은 null. */
export function letterAudioIdOf(syllable: string): string | null {
  const parts = partsOf(syllable);
  if (parts === null || !hasLetterSound(parts[0], parts[1])) return null;
  return `letters/${INITIAL_ROMAN[parts[0]] ?? ""}${MEDIAL_ROMAN[parts[1]] ?? ""}`;
}

/**
 * 소리 파일이 있는 음절 전부(41, ADR-0173) — 자모표 소리를 보드 순서로(같은 소리 「아」는 한 번) 놓고 퀴즈 음절(너 · 도)을 뒤에 둡니다.
 * 소리 파일 목록 · 업로드 도구(`devtools/content/letters-audio.mjs`)가 이 목록 하나를 읽습니다.
 */
export const LETTER_SOUND_SYLLABLES: readonly string[] = /* @__PURE__ */ ((): readonly string[] => {
  const syllables: string[] = [];
  for (const group of JAMO_GROUPS)
    for (const letter of group.letters) {
      const sound = jamoSoundOf(letter.letter);
      if (syllables.indexOf(sound) < 0) syllables.push(sound);
    }
  for (const [initial, medial] of QUIZ_SOUNDS)
    syllables.push(composeSyllable(INITIALS.charAt(initial), MEDIALS.charAt(medial)));
  return syllables;
})();

/** 퀴즈 타일 · 칸의 짧은 로마자 — 자음은 첫소리(g · n · d), 모음은 그 모음(a · eo · o). */
export function jamoTileRomanOf(letter: string): string {
  const initial = INITIALS.indexOf(letter);
  if (letter.length === 1 && initial >= 0) return INITIAL_ROMAN[initial] ?? "";
  const medial = letter.length === 1 ? MEDIALS.indexOf(letter) : -1;
  return medial >= 0 ? (MEDIAL_ROMAN[medial] ?? "") : "";
}

/** 더보기 메뉴 Letters 줄의 동그라미 글자(시안 MoreSheet). */
export const LETTERS_MENU_GLYPH = "가";

/** 추천 대화상자 그림 ㄱ + ㅏ = 가(시안 RecommendWrong · RecommendSyllable). */
export const RECOMMEND_ART = { consonant: "ㄱ", vowel: "ㅏ", syllable: "가" } as const;

/** 받침 없는 음절의 로마자(가 → ga). 아니면 빈 문자열. */
export function syllableRomanOf(syllable: string): string {
  const parts = partsOf(syllable);
  return parts === null ? "" : `${INITIAL_ROMAN[parts[0]] ?? ""}${MEDIAL_ROMAN[parts[1]] ?? ""}`;
}
