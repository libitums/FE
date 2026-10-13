// 결정적 타일 순서입니다 — 씨앗이 같으면 같은 순서이고, 둘 이상이면 원래 순서가 아닙니다(순수).

/** `order[p]` = 자리 `p`에 보일 원래 인덱스. */
export function shuffledOrder(seed: string, length: number): readonly number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];

  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  let state = hash === 0 ? 0x9e3779b9 : hash;
  const next = (): number => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state;
  };

  const order = Array.from({ length }, (_, index) => index);
  for (let i = length - 1; i >= 1; i -= 1) {
    const j = next() % (i + 1);
    const held = order[i] ?? 0;
    order[i] = order[j] ?? 0;
    order[j] = held;
  }
  if (order.every((value, index) => value === index)) {
    return [...order.slice(1), order[0] ?? 0];
  }
  return order;
}
