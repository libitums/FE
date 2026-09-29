// 액세스 토큰(JWT)에서 사용자 ID를 읽습니다. 순수 함수만 있습니다.
//
// 저장하는 세션에는 사용자 ID가 없습니다(ADR-0007 D1 — 토큰 둘과 만료 시각뿐). 분석의 사용자
// 식별(ADR-0029 D8)은 로그인 · 세션 갱신 직후 손에 든 액세스 토큰의 `sub`로 합니다. **서명을
// 검증하지 않습니다** — 이 값은 접근 판정에 쓰지 않고, 토큰은 방금 서버가 준 것입니다.

const base64UrlAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// base64url을 바이트마다 글자 하나인 문자열로 풉니다. Lynx background 런타임에 `atob`이 있다는
// 보장이 없어 직접 풉니다. 아스키 밖 바이트는 글자가 깨지지만 JSON의 구조 문자는 아스키라
// 파싱에는 영향이 없고, 읽는 값(`sub`)은 아스키입니다.
function decodeBase64Url(value: string): string | null {
  let bits = 0;
  let bitCount = 0;
  let decoded = "";
  for (const character of value) {
    const index = base64UrlAlphabet.indexOf(character);
    if (index === -1) {
      return null;
    }
    bits = (bits << 6) | index;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      decoded += String.fromCharCode((bits >> bitCount) & 0xff);
    }
  }
  return decoded;
}

/** JWT가 아니거나 · payload를 못 읽거나 · `sub`가 비지 않은 문자열이 아니면 `null`. 던지지 않습니다. */
export function authUserIdFrom(accessToken: string): string | null {
  const segments = accessToken.split(".");
  const payloadSegment = segments[1];
  if (segments.length !== 3 || payloadSegment === undefined) {
    return null;
  }
  const payloadText = decodeBase64Url(payloadSegment);
  if (payloadText === null) {
    return null;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }
  const subject = (payload as Record<string, unknown>)["sub"];
  return typeof subject === "string" && subject.length > 0 ? subject : null;
}
