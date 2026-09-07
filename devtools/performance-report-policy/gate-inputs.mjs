const ALL_ZERO_SHA = "0000000000000000000000000000000000000000";

function isMissingRef(value) {
  return !value || value === ALL_ZERO_SHA;
}

/**
 * 환경변수로 모드를 가른다. all-zero SHA는 값이 없는 것으로 본다
 * (GitHub이 새 브랜치 push의 `before`로 all-zero를 준다).
 * @param {Record<string, string|undefined>} env
 * @returns {{ mode: "ci", base: string, head: string } | { mode: "local" }}
 */
export function resolveGateMode(env) {
  const base = env?.POLICY_BASE;
  const head = env?.POLICY_HEAD;
  if (!isMissingRef(base) && !isMissingRef(head)) {
    return { mode: "ci", base, head };
  }
  return { mode: "local" };
}

/**
 * `git status --porcelain -z --untracked-files=all` 출력을 구조로 바꾼다.
 * rename/copy는 NUL 필드 둘을 소비한다. 빈 입력은 빈 배열.
 * @param {string} text
 * @returns {Array<{ status: string, path: string, oldPath?: string }>}
 */
export function parsePorcelain(text) {
  if (!text) {
    return [];
  }

  const fields = text.split("\0");
  if (fields.at(-1) === "") {
    fields.pop();
  }

  const changes = [];
  for (let index = 0; index < fields.length;) {
    const field = fields[index++];
    if (!field) {
      continue;
    }
    const status = field.slice(0, 2);
    const rest = field.slice(3);
    if (status[0] === "R" || status[0] === "C") {
      const path = fields[index++];
      changes.push({ status, oldPath: rest, path });
      continue;
    }
    changes.push({ status, path: rest });
  }
  return changes;
}

/**
 * 커밋 범위와 작업 트리 변경을 합쳐 정책 입력을 만든다. 중복은 제거하고 순서는 안정적.
 * @param {{ committed: Array<{status: string, path: string, oldPath?: string}>,
 *           working: Array<{status: string, path: string, oldPath?: string}> }} sets
 * @returns {{ changedFiles: string[], changedHeadFiles: string[], deleted: string[] }}
 */
export function mergeChangeSets(sets) {
  const committed = sets?.committed ?? [];
  const working = sets?.working ?? [];

  const changedFiles = [];
  const changedHeadFiles = [];
  const deleted = [];
  const changedFilesSeen = new Set();
  const changedHeadFilesSeen = new Set();
  const deletedSeen = new Set();

  for (const entry of [...committed, ...working]) {
    const isDeleted = entry.status.includes("D");

    if (entry.oldPath && !changedFilesSeen.has(entry.oldPath)) {
      changedFilesSeen.add(entry.oldPath);
      changedFiles.push(entry.oldPath);
    }
    if (!changedFilesSeen.has(entry.path)) {
      changedFilesSeen.add(entry.path);
      changedFiles.push(entry.path);
    }

    if (isDeleted) {
      if (!deletedSeen.has(entry.path)) {
        deletedSeen.add(entry.path);
        deleted.push(entry.path);
      }
    } else if (!changedHeadFilesSeen.has(entry.path)) {
      changedHeadFilesSeen.add(entry.path);
      changedHeadFiles.push(entry.path);
    }
  }

  return { changedFiles, changedHeadFiles, deleted };
}
