// 문구표 함수 잎을 여러 표본 인자로 불러 양쪽 분기를 돌리고, 영어 결과에 든 자리표시자 값이 각 언어 결과에도 드는지 봅니다(감사 다국어).
// 빈 글을 내는 잎도 모읍니다. 표본: 이름 자리 「NAME_X」, 수 1 · 2, 글 「word」, null, 참 · 거짓.

const NAME = "NAME_X";
const WORD = "WORD_Y";
const SAMPLES: readonly (readonly unknown[])[] = [
  [NAME, NAME, NAME, NAME],
  [WORD, WORD, WORD, WORD],
  [1, 1, 1, 1],
  [2, true, 2, true],
  [NAME, false, 2, false],
  [NAME, null, null, null],
];

type Out = { readonly path: string; readonly sample: number; readonly value: string };

function outputsOf(node: unknown, path = ""): Out[] {
  if (typeof node === "function") {
    const outs: Out[] = [];
    SAMPLES.forEach((args, sample) => {
      try {
        const value = (node as (...a: unknown[]) => unknown)(...args);
        if (typeof value === "string") outs.push({ path, sample, value });
      } catch {
        // 인자 모양이 맞지 않는 표본은 건너뜁니다.
      }
    });
    return outs;
  }
  if (Array.isArray(node)) return node.flatMap((child, i) => outputsOf(child, `${path}[${i}]`));
  if (node !== null && typeof node === "object")
    return Object.entries(node as Record<string, unknown>).flatMap(([key, child]) =>
      outputsOf(child, path === "" ? key : `${path}.${key}`),
    );
  return [];
}

/** 영어 결과에 자리표시자가 들었는데 그 언어 결과에는 없는 잎 · 빈 글을 낸 잎. */
export function placeholderProblems(table: unknown, english: unknown) {
  const en = new Map(outputsOf(english).map((out) => [`${out.path}#${out.sample}`, out.value]));
  const missing: string[] = [];
  const empty: string[] = [];
  for (const out of outputsOf(table)) {
    if (out.value.trim() === "") empty.push(`${out.path}#${out.sample}`);
    const base = en.get(`${out.path}#${out.sample}`);
    if (base === undefined) continue;
    for (const token of [NAME, WORD])
      if (base.includes(token) && !out.value.includes(token))
        missing.push(`${out.path}#${out.sample}`);
  }
  return { missing, empty };
}
