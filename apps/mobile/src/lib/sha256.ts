import "background-only";

// SHA-256 — 받은 콘텐츠의 무결성 검사용 순수 구현입니다. Lynx 백그라운드에 Web Crypto가
// 있다는 근거가 없어 외부 의존 없이 둡니다.

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

const INITIAL = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

/** 서로게이트 쌍을 처리하는 UTF-8 인코딩입니다. 짝 없는 서로게이트는 U+FFFD가 됩니다. */
export function utf8Bytes(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i += 1;
      }
    }
    if (code >= 0xd800 && code <= 0xdfff) {
      code = 0xfffd;
    }
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
}

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function padded(bytes: Uint8Array): Uint8Array {
  const length = bytes.length;
  const total = (((length + 8) >> 6) + 1) << 6;
  const out = new Uint8Array(total);
  out.set(bytes);
  out[length] = 0x80;
  const view = new DataView(out.buffer);
  view.setUint32(total - 8, Math.floor(length / 0x20000000));
  view.setUint32(total - 4, (length << 3) >>> 0);
  return out;
}

/** 한 블록(64바이트)을 압축해 상태 여덟 워드를 갱신합니다. */
function compress(state: number[], view: DataView, offset: number): void {
  const w: number[] = [];
  for (let t = 0; t < 16; t += 1) {
    w.push(view.getUint32(offset + t * 4));
  }
  for (let t = 16; t < 64; t += 1) {
    const w15 = w[t - 15] as number;
    const w2 = w[t - 2] as number;
    const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
    const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
    w.push(((w[t - 16] as number) + s0 + (w[t - 7] as number) + s1) >>> 0);
  }

  let a = state[0] as number;
  let b = state[1] as number;
  let c = state[2] as number;
  let d = state[3] as number;
  let e = state[4] as number;
  let f = state[5] as number;
  let g = state[6] as number;
  let h = state[7] as number;
  for (let t = 0; t < 64; t += 1) {
    const sigma1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
    const choose = (e & f) ^ (~e & g);
    const temp1 = (h + sigma1 + choose + (K[t] as number) + (w[t] as number)) >>> 0;
    const sigma0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
    const majority = (a & b) ^ (a & c) ^ (b & c);
    const temp2 = (sigma0 + majority) >>> 0;
    h = g;
    g = f;
    f = e;
    e = (d + temp1) >>> 0;
    d = c;
    c = b;
    b = a;
    a = (temp1 + temp2) >>> 0;
  }
  const next = [a, b, c, d, e, f, g, h];
  for (let i = 0; i < 8; i += 1) {
    state[i] = ((state[i] as number) + (next[i] as number)) >>> 0;
  }
}

/** 소문자 hex 64자. */
export function sha256Hex(bytes: Uint8Array): string {
  const state = [...INITIAL];
  const data = padded(bytes);
  const view = new DataView(data.buffer);
  for (let offset = 0; offset < data.length; offset += 64) {
    compress(state, view, offset);
  }
  return state.map((word) => word.toString(16).padStart(8, "0")).join("");
}
