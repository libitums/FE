// 메신저 가상 키보드(두벌식)의 순수 로직입니다. 누른 키의 열에서 화면에 보일 글자를
// 조합하고, 거꾸로 문장을 누를 키의 열로 풉니다. DOM · 컴포넌트를 만지지 않습니다.
//
// **입력의 진실은 누른 키의 열입니다.** 조합된 글자를 상태로 들고 다니지 않습니다 — 지우기가
// 마지막 키 하나를 빼고 다시 조합하면 되므로, 조합 중 음절을 자모 하나씩 되돌리는
// 휴대폰 키보드의 동작이 따로 규칙 없이 나옵니다.

const initials = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
const medials = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
const finals = ["", ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"];

const compoundMedials: Readonly<Record<string, string>> = {
  ㅗㅏ: "ㅘ",
  ㅗㅐ: "ㅙ",
  ㅗㅣ: "ㅚ",
  ㅜㅓ: "ㅝ",
  ㅜㅔ: "ㅞ",
  ㅜㅣ: "ㅟ",
  ㅡㅣ: "ㅢ",
};

const compoundFinals: Readonly<Record<string, string>> = {
  ㄱㅅ: "ㄳ",
  ㄴㅈ: "ㄵ",
  ㄴㅎ: "ㄶ",
  ㄹㄱ: "ㄺ",
  ㄹㅁ: "ㄻ",
  ㄹㅂ: "ㄼ",
  ㄹㅅ: "ㄽ",
  ㄹㅌ: "ㄾ",
  ㄹㅍ: "ㄿ",
  ㄹㅎ: "ㅀ",
  ㅂㅅ: "ㅄ",
};

// 겹받침을 두 자모로 되돌리는 표입니다 — 받침 뒤에 모음이 오면 뒤 자모가 다음 음절의
// 첫소리로 넘어갑니다(`앉` + `ㅏ` → `안자`).
const splitFinals: Readonly<Record<string, readonly [string, string]>> = Object.fromEntries(
  Object.entries(compoundFinals).map(([pair, joined]) => [joined, [pair[0], pair[1]]] as const),
);

/** 윗글쇠(⇧)로 바뀌는 키입니다. 디자인 자판에는 겹자음 · ㅒ · ㅖ 키가 따로 없습니다. */
export const shiftedKeys: Readonly<Record<string, string>> = {
  ㅂ: "ㅃ",
  ㅈ: "ㅉ",
  ㄷ: "ㄸ",
  ㄱ: "ㄲ",
  ㅅ: "ㅆ",
  ㅐ: "ㅒ",
  ㅔ: "ㅖ",
};

const unshiftedKeys: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(shiftedKeys).map(([base, shifted]) => [shifted, base]),
);

/** 디자인(Figma 80-7082)의 자모 키 세 줄입니다. */
export const hangulKeyRows: readonly (readonly string[])[] = [
  [..."ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ"],
  [..."ㅁㄴㅇㄹㅎㅗㅓㅏㅣ"],
  [..."ㅋㅌㅊㅍㅠㅜㅡ"],
];

const isMedial = (key: string) => medials.includes(key);
const isInitial = (key: string) => initials.includes(key);

type Syllable = { initial?: string; medial?: string; final?: string };

function render(syllable: Syllable): string {
  const { initial, medial, final = "" } = syllable;
  if (initial !== undefined && medial !== undefined) {
    const code =
      0xac00 +
      (initials.indexOf(initial) * medials.length + medials.indexOf(medial)) * finals.length +
      finals.indexOf(final);
    return String.fromCharCode(code);
  }
  return initial ?? medial ?? "";
}

/**
 * 누른 키의 열을 글자로 조합합니다(두벌식). 자모가 아닌 키(공백 · 문장 부호)는 조합 중인
 * 음절을 끊고 그대로 붙습니다.
 */
export function composeHangul(keys: readonly string[]): string {
  let done = "";
  let current: Syllable = {};

  const flush = () => {
    done += render(current);
    current = {};
  };

  for (const key of keys) {
    if (isMedial(key)) {
      if (current.final !== undefined) {
        // 받침이 다음 음절의 첫소리로 넘어갑니다.
        const split = splitFinals[current.final];
        const moved = split === undefined ? current.final : split[1];
        const kept = split === undefined ? undefined : split[0];
        current = { ...current, final: kept };
        flush();
        current = { initial: moved, medial: key };
      } else if (current.medial !== undefined) {
        const joined = compoundMedials[current.medial + key];
        if (joined === undefined) {
          flush();
          current = { medial: key };
        } else {
          current = { ...current, medial: joined };
        }
      } else if (current.initial !== undefined) {
        current = { ...current, medial: key };
      } else {
        current = { medial: key };
      }
      continue;
    }

    if (isInitial(key)) {
      if (current.initial !== undefined && current.medial !== undefined) {
        if (current.final === undefined) {
          if (finals.includes(key)) {
            current = { ...current, final: key };
            continue;
          }
        } else {
          const joined = compoundFinals[current.final + key];
          if (joined !== undefined) {
            current = { ...current, final: joined };
            continue;
          }
        }
      }
      flush();
      current = { initial: key };
      continue;
    }

    flush();
    done += key;
  }

  flush();
  return done;
}

/**
 * 문장을 누를 키의 열로 풉니다. 겹자음 · ㅒ · ㅖ는 윗글쇠(`shift`)를 앞에 둡니다. 겹모음 ·
 * 겹받침은 두 키로 풉니다. 조합 결과가 원문과 같아야 하는 것이 이 함수의 계약입니다.
 */
export function keystrokesFor(text: string): readonly string[] {
  const strokes: string[] = [];
  const press = (jamo: string) => {
    const base = unshiftedKeys[jamo];
    if (base === undefined) {
      strokes.push(jamo);
    } else {
      strokes.push("shift", base);
    }
  };
  const pressMedial = (medial: string) => {
    const pair = Object.entries(compoundMedials).find(([, joined]) => joined === medial);
    if (pair === undefined) {
      press(medial);
    } else {
      press(pair[0][0]);
      press(pair[0][1]);
    }
  };

  for (const char of text) {
    const offset = char.charCodeAt(0) - 0xac00;
    if (offset < 0 || offset > 11171) {
      strokes.push(char === " " ? "space" : char);
      continue;
    }
    const final = finals[offset % finals.length];
    const medial = medials[Math.floor(offset / finals.length) % medials.length];
    const initial = initials[Math.floor(offset / (finals.length * medials.length))];
    press(initial);
    pressMedial(medial);
    if (final !== "") {
      const split = splitFinals[final];
      if (split === undefined) {
        press(final);
      } else {
        press(split[0]);
        press(split[1]);
      }
    }
  }
  return strokes;
}

// 채점은 한글 · 영문 · 숫자만 봅니다 — 띄어쓰기와 문장 부호는 학습자가 이 자판으로 고르기
// 어렵고, 이 테스트가 보려는 것은 문장을 이루는 말입니다.
const normalize = (text: string) => text.replace(/[^0-9A-Za-zㄱ-ㆎ가-힣]/g, "");

/** 입력한 문장이 정답과 같은 말인지 봅니다. */
export function isTypedAnswerCorrect(typed: string, answer: string): boolean {
  const normalized = normalize(typed);
  return normalized.length > 0 && normalized === normalize(answer);
}

/**
 * 정답을 초성으로 가립니다(`좋아요!` → `ㅈㅇㅇ!`). 글자 수와 첫소리가 보여 학습자가 무엇을
 * 칠지 짐작할 수 있지만 답을 그대로 베끼지는 못합니다. 한글 음절이 아닌 글자는 그대로 둡니다.
 */
export function maskedAnswer(text: string): string {
  return [...text]
    .map((char) => {
      const offset = char.charCodeAt(0) - 0xac00;
      if (offset < 0 || offset > 11171) return char;
      return initials[Math.floor(offset / (finals.length * medials.length))];
    })
    .join("");
}
