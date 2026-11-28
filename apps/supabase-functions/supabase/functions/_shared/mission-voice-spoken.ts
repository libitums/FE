// TTS에 보낼 읽기 글 — 아라비아 숫자를 한국어 수 읽기로(「3,000원」 → 「삼천원」, 「1잔」 → 「한잔」). 화면 글은 그대로 두고 벤더에 보내는
// 글만 바꾼다. 대시보드 `stt_score.normalize_korean`의 숫자 규칙(개수 단위 앞 1 ~ 99는 고유어 수, 나머지는 한자어 수)과 같다. 순수 함수입니다.

const sinoDigits = "영일이삼사오육칠팔구";
const nativeOnes = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉"];
const nativeTens = ["", "열", "스물", "서른", "마흔", "쉰", "예순", "일흔", "여든", "아흔"];
/** 고유어 수를 쓰는 단위(긴 것 먼저 — 「시간」이 「시」보다 앞). */
export const COUNTERS = ["잔", "개", "명", "시간", "시", "살", "마리", "병", "장", "권", "번째"];

/** 정수 → 한자어 수(「1000」 → 「천」, 「10500」 → 「만오백」). 0은 「영」. */
export function sino(n: number): string {
  if (n === 0) return "영";
  const out: string[] = [];
  for (const [unitValue, unit] of [
    [1e8, "억"],
    [1e4, "만"],
    [1, ""],
  ] as const) {
    const chunk = Math.floor(n / unitValue) % 10000;
    if (chunk === 0) continue;
    let part = "";
    for (const [value, name] of [
      [1000, "천"],
      [100, "백"],
      [10, "십"],
      [1, ""],
    ] as const) {
      const d = Math.floor(chunk / value) % 10;
      if (d > 0) part += (d === 1 && name !== "" ? "" : sinoDigits[d]) + name;
    }
    out.push((part === "일" && unit === "만" ? "" : part) + unit);
  }
  return out.join("");
}

/** 1 ~ 99 → 고유어 수(단위 앞 꼴: 한 · 두 · 세 · 네 · 스무). */
export function native(n: number): string {
  if (n === 20) return "스무";
  return nativeTens[Math.floor(n / 10)]! + nativeOnes[n % 10]!;
}

// 대시보드와 한 가지 다르다: 숫자 뒤의 쉼표(「1, 2」)는 숫자로 먹지 않는다(`\d[\d,]*\d`).
const numberPattern = new RegExp(`(\\d(?:[\\d,]*\\d)?)(\\s*)(${COUNTERS.join("|")})?`, "gu");

export function spokenText(text: string): string {
  return text.replace(numberPattern, (whole, raw: string, gap: string, counter?: string) => {
    const digits = raw.replace(/,/g, "");
    if (!/^\d+$/.test(digits) || digits.length > 12) return whole;
    const n = Number(digits);
    let said: string;
    if (counter === "번째" && n >= 1 && n <= 99) said = n === 1 ? "첫" : native(n);
    else if (counter !== undefined && n >= 1 && n <= 99) said = native(n);
    else said = sino(n);
    return said + gap + (counter ?? "");
  });
}
