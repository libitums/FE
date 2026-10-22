// 입력한 답(글자)의 판정입니다(순수).
//
// 채점은 한글 · 영문 · 숫자만 봅니다 — 띄어쓰기와 문장 부호는 학습자가 자판으로 고르기
// 어렵고, 이 테스트가 보려는 것은 문장을 이루는 말입니다.
// NFC로 먼저 모읍니다 — 정답 데이터가 NFD(첫가끝 자모, U+1100대)로 들어오면 아래 거름이 한글을
// 전부 떼어 빈 문자열이 됩니다. 자판 입력은 늘 완성형이지만 정답 문자열은 밖에서 옵니다.
// Lynx JS 엔진에 `normalize`가 없을 수 있어, 없으면 원문 그대로 둡니다(채점이 던지지 않게).
const toNfc = (text: string) =>
  typeof text.normalize === "function" ? text.normalize("NFC") : text;

/** 비교용으로 다듬은 글 — NFC로 모으고 한글 · 영문 · 숫자 밖의 글자(기호 · 공백)를 뗍니다. */
export function normalizeAnswerText(text: string): string {
  return toNfc(text).replace(/[^0-9A-Za-zㄱ-ㆎ가-힣]/g, "");
}

/** 입력한 문장이 정답과 같은 말인지 봅니다. */
export function isTypedAnswerCorrect(typed: string, answer: string): boolean {
  const normalized = normalizeAnswerText(typed);
  return normalized.length > 0 && normalized === normalizeAnswerText(answer);
}

/** 정답 목록 중 하나라도 입력과 같은 말이면 참입니다. */
export function isTypedAnswerAccepted(typed: string, answers: readonly string[]): boolean {
  return answers.some((answer) => isTypedAnswerCorrect(typed, answer));
}
