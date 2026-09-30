// base64 · base64url · UTF-8 바이트 변환입니다. 순수 함수만 있습니다(런타임 중립 — `Buffer` · `atob` 없음).

const standardAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const urlAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** 패딩 없는 base64url입니다. */
export function base64UrlFromBytes(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += urlAlphabet[b0 >> 2]!;
    out += urlAlphabet[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)]!;
    if (b1 !== undefined) out += urlAlphabet[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)]!;
    if (b2 !== undefined) out += urlAlphabet[b2 & 0x3f]!;
  }
  return out;
}

function decode(text: string, alphabet: string): Uint8Array | null {
  const values: number[] = [];
  for (const char of text) {
    const value = alphabet.indexOf(char);
    if (value < 0) return null;
    values.push(value);
  }
  if (values.length % 4 === 1) return null;
  const bytes: number[] = [];
  for (let i = 0; i < values.length; i += 4) {
    const v0 = values[i]!;
    const v1 = values[i + 1]!;
    const v2 = values[i + 2];
    const v3 = values[i + 3];
    bytes.push((v0 << 2) | (v1 >> 4));
    if (v2 !== undefined) bytes.push(((v1 & 0x0f) << 4) | (v2 >> 2));
    if (v3 !== undefined) bytes.push(((v2! & 0x03) << 6) | v3);
  }
  return new Uint8Array(bytes);
}

/** 표준 base64(패딩 허용)입니다. 알파벳 밖 글자면 `null`. 던지지 않습니다. */
export function bytesFromBase64(text: string): Uint8Array | null {
  let body = text;
  let padding = 0;
  while (padding < 2 && body.endsWith("=")) {
    body = body.slice(0, -1);
    padding += 1;
  }
  if (padding > 0 && text.length % 4 !== 0) return null;
  return decode(body, standardAlphabet);
}

/** base64url(패딩 없음)입니다. 알파벳 밖 글자면 `null`. 던지지 않습니다. */
export function bytesFromBase64Url(text: string): Uint8Array | null {
  return decode(text, urlAlphabet);
}

export function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}
