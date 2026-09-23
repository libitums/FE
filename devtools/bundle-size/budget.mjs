// 번들 크기 예산 판정입니다. 파일을 읽지 않고 크기 목록만 받아 판정합니다 — 그래야 이
// 모듈을 파일 시스템 없이 테스트할 수 있습니다. 읽는 일은 `check.mjs`가 집니다.

/**
 * 예산 파일의 모양을 확인하고 targets를 돌려줍니다. 잘못된 예산은 빌드가 커진 것과 다른
 * 사건이라, 위반이 아니라 오류로 던집니다.
 */
export function parseBudget(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("예산 파일은 객체여야 합니다.");
  }
  const { targets } = raw;
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("예산 파일에 targets 배열이 있어야 하고 비어 있지 않아야 합니다.");
  }
  return targets.map((target, index) => {
    if (target === null || typeof target !== "object") {
      throw new Error(`targets[${index}]가 객체가 아닙니다.`);
    }
    const { path, maxBytes } = target;
    if (typeof path !== "string" || !path.trim()) {
      throw new Error(`targets[${index}].path가 비어 있습니다.`);
    }
    if (!Number.isInteger(maxBytes) || maxBytes <= 0) {
      throw new Error(`${path}의 maxBytes가 양의 정수가 아닙니다.`);
    }
    return { path, maxBytes };
  });
}

/**
 * 예산과 실측 크기를 대조합니다. `sizes`는 경로를 바이트 수로 잇는 Map이고, 값이 없으면
 * 산출물이 없다는 뜻이라 위반으로 답니다 — 빌드를 돌리지 않고 통과하는 길을 막습니다.
 */
export function evaluateBundleBudget({ targets, sizes }) {
  const results = targets.map((target) => {
    const actualBytes = sizes.get(target.path);
    if (actualBytes === undefined) {
      return { ...target, actualBytes: null, status: "missing" };
    }
    return {
      ...target,
      actualBytes,
      status: actualBytes > target.maxBytes ? "over" : "ok",
      // 남은 여유입니다. 음수면 초과한 양입니다.
      remainingBytes: target.maxBytes - actualBytes,
    };
  });

  const violations = results.filter((result) => result.status !== "ok");
  return { ok: violations.length === 0, results, violations };
}

/**
 * 사람이 읽을 크기입니다. 소수점 한 자리까지만 적어 표가 흔들리지 않게 합니다.
 *
 * 숫자가 아닌 값은 전부 「없음」으로 적습니다. 이 파일은 타입 검사가 없는 `.mjs`라, 크기를
 * 못 읽은 자리가 `NaN kB`로 새어 나가면 읽는 사람이 0에 가까운 값으로 오해합니다.
 */
export function formatBytes(bytes) {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) return "없음";
  return `${(bytes / 1000).toFixed(1)} kB`;
}
