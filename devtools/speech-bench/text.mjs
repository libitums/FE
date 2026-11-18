// 받아쓰기 비교에 쓰는 글 정규화와 편집 거리입니다.
//
// 한국어는 띄어쓰기가 사람마다 · 엔진마다 달라서, 띄어쓰기를 뺀 음절 기준 CER을 주 지표로
// 보고 띄어쓰기를 포함한 CER과 어절(공백으로 나눈 낱말) 기준 WER을 같이 봅니다.

/** 비교용 정규화: NFC, 소문자, 문장 부호 · 기호 제거, 공백 하나로. */
export function normalize(text, { strip = [] } = {}) {
  let out = String(text ?? "").normalize("NFC");
  for (const pattern of strip) out = out.replace(new RegExp(pattern, "gu"), " ");
  return out
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/** 띄어쓰기를 뺀 글자 배열(한글은 음절 하나가 글자 하나). */
export const charsNoSpace = (text) => [...normalize(text).replace(/ /g, "")];
/** 띄어쓰기를 글자 하나로 센 배열. */
export const charsWithSpace = (text) => [...normalize(text)];
/** 어절 배열. */
export const words = (text) => {
  const n = normalize(text);
  return n === "" ? [] : n.split(" ");
};

/** 레벤슈타인 거리(치환 · 삽입 · 삭제 각 1). 배열 두 개를 받습니다. */
export function editDistance(ref, hyp) {
  if (ref.length === 0) return hyp.length;
  if (hyp.length === 0) return ref.length;
  let prev = Array.from({ length: hyp.length + 1 }, (_, j) => j);
  for (let i = 1; i <= ref.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= hyp.length; j += 1) {
      const sub = prev[j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1);
      cur[j] = Math.min(sub, prev[j] + 1, cur[j - 1] + 1);
    }
    prev = cur;
  }
  return prev[hyp.length];
}

const UNITS = { cerNoSpace: charsNoSpace, cerWithSpace: charsWithSpace, wer: words };

/**
 * 말뭉치 단위 오류율입니다(편집 수의 합 ÷ 정답 길이의 합). 발화마다 평균을 내면 짧은 발화가
 * 과하게 무거워지므로 합으로 셉니다. pairs: [{ ref, hyp }].
 */
export function errorRates(pairs) {
  const out = {};
  for (const [name, split] of Object.entries(UNITS)) {
    let edits = 0;
    let total = 0;
    for (const { ref, hyp } of pairs) {
      const r = split(ref);
      edits += editDistance(r, split(hyp));
      total += r.length;
    }
    out[name] = total === 0 ? null : edits / total;
  }
  out.n = pairs.length;
  return out;
}

/** 한 쌍의 띄어쓰기 뺀 CER입니다. 정답이 비면 null. */
export function cer(ref, hyp) {
  const r = charsNoSpace(ref);
  return r.length === 0 ? null : editDistance(r, charsNoSpace(hyp)) / r.length;
}

/**
 * 「틀린 발음이 맞는 낱말로 받아 적힌」 근사입니다. 사람 전사(실제로 한 말)와 기준 문장
 * (읽어야 했던 말)이 다른 발화만 셉니다.
 * - strict: 벤더 결과가 기준 문장과 (띄어쓰기 · 부호를 빼고) 똑같음
 * - loose: 벤더 결과가 사람 전사보다 기준 문장에 더 가까움(CER 비교)
 * rows: [{ reference, human, hyp }]
 */
export function towardReference(rows) {
  let eligible = 0;
  let strict = 0;
  let loose = 0;
  for (const { reference, human, hyp } of rows) {
    const ref = charsNoSpace(reference).join("");
    const said = charsNoSpace(human).join("");
    if (ref === "" || said === "" || ref === said) continue;
    eligible += 1;
    const got = charsNoSpace(hyp).join("");
    if (got === ref) strict += 1;
    if (cer(reference, hyp) < cer(human, hyp)) loose += 1;
  }
  return {
    eligible,
    strict: eligible === 0 ? null : strict / eligible,
    loose: eligible === 0 ? null : loose / eligible,
  };
}
