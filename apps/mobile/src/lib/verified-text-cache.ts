import "background-only";

// 원격 본문의 검증 결과를 편 id별로 기억합니다. 받기 중에는 편 하나가 갖춰질 때마다 카탈로그를 다시 만드는데, 그때마다
// 받아 둔 본문 전부의 sha256 · 디코드를 다시 하면 탭 처리와 같은 백그라운드 스레드가 막혔습니다. 같은 id · 같은 원문이면
// 이전 결과를 씁니다 — 원문이 한 글자라도 다르면 다시 계산하므로 무결성 판정은 그대로입니다. id마다 마지막 하나만 둡니다.

import { nativeContentDigest } from "./content-files";
import { sha256Hex, utf8Bytes } from "./sha256";

type Digest = { readonly sha256: string; readonly bytes: number };

const digests = new Map<string, { readonly text: string; readonly digest: Digest }>();
// 디코드 결과는 검증을 마친 sha256으로 가립니다 — 원문을 두 번 들고 있지 않습니다(리뷰 반영).
const decodes = new Map<string, { readonly sha256: string; readonly result: unknown }>();

/** 원문의 sha256과 UTF-8 바이트 수입니다. 같은 id의 마지막 원문과 같으면 계산하지 않습니다. */
export function textDigestOf(id: string, text: string): Digest {
  const known = digests.get(id);
  if (known !== undefined && known.text === text) return known.digest;
  // 호스트가 계산할 수 있으면 그것(ADR-0105 D4), 없으면 JS 순수 구현입니다.
  const digest = nativeContentDigest(text) ?? jsDigestOf(text);
  digests.set(id, { text, digest });
  return digest;
}

function jsDigestOf(text: string): Digest {
  const bytes = utf8Bytes(text);
  return { sha256: sha256Hex(bytes), bytes: bytes.length };
}

/**
 * 같은 id · 같은 sha256(이미 원문과 맞춰 본 값)의 이전 결과가 있으면 그것(같은 객체), 없으면 `compute()`의 결과를
 * 기억해 돌려줍니다. 부르는 쪽이 무결성을 먼저 확인한 뒤에만 부릅니다.
 */
export function rememberedDecode<T>(id: string, sha256: string, compute: () => T): T {
  const known = decodes.get(id);
  if (known !== undefined && known.sha256 === sha256) return known.result as T;
  const result = compute();
  decodes.set(id, { sha256, result });
  return result;
}
