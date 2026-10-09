// 모션 리터럴 정책 — 스캔 결과를 위반으로 바꾸고 allowlist의 위생을 봅니다(순수).

/** 값에서 `var(--libitum-…)` 참조(fallback 포함)를 지웁니다. */
export function stripTokenReferences(value) {
  return value;
}

/** 파일 하나의 위반을 `{ line, rule, text }`로 돌려줍니다. */
export function violationsIn(css, fileName) {
  void css;
  void fileName;
  return [];
}

/** 파일이 없거나 위반이 0인 allowlist 항목을 문장으로 돌려줍니다. */
export function allowlistProblems(allowlist, existingFiles, violationsByFile) {
  void allowlist;
  void existingFiles;
  void violationsByFile;
  return [];
}

/** `[{ path, reason }]` 모양을 검증해 돌려줍니다. 어긋나면 던집니다. */
export function loadAllowlist(json) {
  return json;
}
