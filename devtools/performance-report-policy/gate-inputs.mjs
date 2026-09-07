/**
 * 환경변수로 모드를 가른다. all-zero SHA는 값이 없는 것으로 본다
 * (GitHub이 새 브랜치 push의 `before`로 all-zero를 준다).
 * @param {Record<string, string|undefined>} env
 * @returns {{ mode: "ci", base: string, head: string } | { mode: "local" }}
 */
export function resolveGateMode(env) {
  throw new Error("not implemented: resolveGateMode");
}

/**
 * `git status --porcelain -z --untracked-files=all` 출력을 구조로 바꾼다.
 * rename/copy는 NUL 필드 둘을 소비한다. 빈 입력은 빈 배열.
 * @param {string} text
 * @returns {Array<{ status: string, path: string, oldPath?: string }>}
 */
export function parsePorcelain(text) {
  throw new Error("not implemented: parsePorcelain");
}

/**
 * 커밋 범위와 작업 트리 변경을 합쳐 정책 입력을 만든다. 중복은 제거하고 순서는 안정적.
 * @param {{ committed: Array<{status: string, path: string, oldPath?: string}>,
 *           working: Array<{status: string, path: string, oldPath?: string}> }} sets
 * @returns {{ changedFiles: string[], changedHeadFiles: string[], deleted: string[] }}
 */
export function mergeChangeSets(sets) {
  throw new Error("not implemented: mergeChangeSets");
}
