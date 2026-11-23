// 문구표의 문자열 잎을 모아 영어 표와 맞대는 테스트 도우미입니다(태국어 · 미얀마어 표 단위 테스트가 함께 씁니다).
// 함수 잎은 표본 인자로 불러 낸 글을 잎으로 셉니다 — 번역이 함수 안에 있어도 문자 검사에 들어오게.

type Leaf = { readonly path: string; readonly value: string };

const SAMPLE_ARGS: readonly unknown[] = [3, 3, 3, 3];

function leavesOf(node: unknown, path = ""): Leaf[] {
  if (typeof node === "string") return [{ path, value: node }];
  if (typeof node === "function") {
    try {
      const out = (node as (...args: unknown[]) => unknown)(...SAMPLE_ARGS);
      return typeof out === "string" ? [{ path: `${path}()`, value: out }] : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(node)) return node.flatMap((child, i) => leavesOf(child, `${path}[${i}]`));
  if (node !== null && typeof node === "object") {
    return Object.entries(node as Record<string, unknown>).flatMap(([key, child]) =>
      leavesOf(child, path === "" ? key : `${path}.${key}`),
    );
  }
  return [];
}

export function scriptLeaves(table: unknown, english: unknown) {
  const englishByPath = new Map(leavesOf(english).map((leaf) => [leaf.path, leaf.value]));
  const strings = leavesOf(table).filter((leaf) => leaf.value.trim() !== "");
  return {
    strings,
    english: (path: string): string | undefined => englishByPath.get(path),
    sameAsEnglish: strings.filter(({ path, value }) => englishByPath.get(path) === value),
  };
}
