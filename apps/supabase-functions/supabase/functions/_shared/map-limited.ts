// 런타임 중립 — Deno Edge Function과 vitest 둘 다에서 돈다.

/** 순서를 지키며 동시에 `limit`개까지 돌립니다. `run`이 던지면 그대로 던집니다(던지지 않게 감싸는 것은 부르는 쪽). */
export async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, worker));
  return results;
}
