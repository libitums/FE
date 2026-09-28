// PKCE(RFC 7636) 순수 계산입니다 — 바이트 → verifier → challenge. 호스트에 위임하지
// 않습니다 — 여러 블록 · 패딩 경계를 지키는 SHA-256을 JS로 직접 짭니다.

import type { PkcePair } from "./social-sign-in.contract";

/** RFC 7636 권장 32바이트. base64url로 43자입니다. */
export const codeVerifierByteCount = 32;

// FIPS 180-4 §4.2.2 — 64개 상수(첫 64개 소수의 세제곱근의 소수부 32비트).
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

// FIPS 180-4 §5.3.3 — SHA-256 초기 해시값(첫 8개 소수의 제곱근의 소수부 32비트).
const initialHash = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

function rotr(value: number, bits: number): number {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}

/**
 * 메시지를 512비트(64바이트) 블록으로 패딩합니다(FIPS 180-4 §5.1.1) — 55/56/64바이트
 * 경계에서 패딩이 새 블록으로 넘어가는지를 정확히 지킵니다.
 */
function paddedBlocks(bytes: Uint8Array): Uint8Array {
  const bitLength = bytes.length * 8;
  // 원본 + 0x80 한 바이트 + 8바이트 길이. 64로 나눈 나머지가 56 미만이어야
  // 길이 8바이트가 같은 블록에 들어간다.
  const withOnePad = bytes.length + 1;
  const remainder = withOnePad % 64;
  const zeroPadLength = remainder <= 56 ? 56 - remainder : 120 - remainder;
  const totalLength = withOnePad + zeroPadLength + 8;

  const padded = new Uint8Array(totalLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  // 길이는 64비트 빅엔디언이지만 실사용 메시지는 2^32비트를 넘지 않으므로 상위
  // 32비트는 0으로 둔다.
  const view = new DataView(padded.buffer);
  view.setUint32(totalLength - 4, bitLength >>> 0, false);

  return padded;
}

/** FIPS 180-4 SHA-256. 32바이트를 돌려줍니다. */
export function sha256(bytes: Uint8Array): Uint8Array {
  const padded = paddedBlocks(bytes);
  const view = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);

  let [h0, h1, h2, h3, h4, h5, h6, h7] = initialHash;

  const w = new Int32Array(64);
  for (let blockStart = 0; blockStart < padded.length; blockStart += 64) {
    for (let t = 0; t < 16; t += 1) {
      w[t] = view.getUint32(blockStart + t * 4, false);
    }
    for (let t = 16; t < 64; t += 1) {
      const wt15 = w[t - 15] as number;
      const wt2 = w[t - 2] as number;
      const s0 = rotr(wt15, 7) ^ rotr(wt15, 18) ^ (wt15 >>> 3);
      const s1 = rotr(wt2, 17) ^ rotr(wt2, 19) ^ (wt2 >>> 10);
      w[t] = (((w[t - 16] as number) + s0 + (w[t - 7] as number) + s1) | 0) as number;
    }

    let [a, b, c, d, e, f, g, h] = [h0, h1, h2, h3, h4, h5, h6, h7];

    for (let t = 0; t < 64; t += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + (K[t] as number) + (w[t] as number)) | 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const digest = new Uint8Array(32);
  const digestView = new DataView(digest.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((word, index) => {
    digestView.setUint32(index * 4, word >>> 0, false);
  });

  return digest;
}

const base64UrlAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** RFC 4648 §5 base64url, 패딩 없음. */
export function base64UrlFromBytes(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] as number;
    const b1 = i + 1 < bytes.length ? (bytes[i + 1] as number) : undefined;
    const b2 = i + 2 < bytes.length ? (bytes[i + 2] as number) : undefined;

    const triple = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0);

    result += base64UrlAlphabet[(triple >> 18) & 0x3f];
    result += base64UrlAlphabet[(triple >> 12) & 0x3f];
    if (b1 !== undefined) {
      result += base64UrlAlphabet[(triple >> 6) & 0x3f];
    }
    if (b2 !== undefined) {
      result += base64UrlAlphabet[triple & 0x3f];
    }
  }
  return result;
}

/** `base64UrlFromBytes(sha256(ASCII 바이트))`. */
export function codeChallengeFor(verifier: string): string {
  const bytes = new Uint8Array(verifier.length);
  for (let i = 0; i < verifier.length; i += 1) {
    bytes[i] = verifier.charCodeAt(i);
  }
  return base64UrlFromBytes(sha256(bytes));
}

/** `verifier = base64UrlFromBytes(bytes)` · `challenge = codeChallengeFor(verifier)`. */
export function pkcePairFrom(bytes: Uint8Array): PkcePair {
  const verifier = base64UrlFromBytes(bytes);
  return { verifier, challenge: codeChallengeFor(verifier) };
}
