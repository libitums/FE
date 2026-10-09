// 모션 리터럴 정책 — 스캔 결과를 위반으로 바꾸고 allowlist의 위생을 봅니다(순수).

import { mediaQueriesIn, motionDeclarationsIn } from "./scan.mjs";

const tokenReferenceStart = "var(--libitum-";
const easingFunctionPattern = /\b(?:cubic-bezier|steps|square-bezier)\([^)]*\)/gi;
const timeLiteralPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:ms|s)$/i;
const easingKeywords = new Set([
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "ease-in-ease-out",
  "linear",
  "step-start",
  "step-end",
]);

/** 값에서 `var(--libitum-…)` 참조(fallback 포함, 괄호 균형)를 지웁니다. */
export function stripTokenReferences(value) {
  let result = value;
  for (;;) {
    const start = result.indexOf(tokenReferenceStart);
    if (start === -1) {
      return result;
    }
    let depth = 0;
    let end = result.length;
    for (let cursor = start; cursor < result.length; cursor += 1) {
      if (result[cursor] === "(") {
        depth += 1;
      } else if (result[cursor] === ")") {
        depth -= 1;
        if (depth === 0) {
          end = cursor + 1;
          break;
        }
      }
    }
    result = `${result.slice(0, start)} ${result.slice(end)}`;
  }
}

/** 값 하나의 시간 · 이징 리터럴 위반을 `{ rule, text }`로 돌려줍니다. 토큰 참조는 뺍니다. */
export function valueViolations(value) {
  const violations = [];
  const remaining = stripTokenReferences(value);
  for (const match of remaining.matchAll(easingFunctionPattern)) {
    violations.push({ rule: "easing-function", text: match[0] });
  }
  // 괄호도 구분자로 본다 — calc(100ms) · var(--other, ease)처럼 괄호에 붙은 리터럴이 검사를 비껴가지 않게.
  for (const token of remaining.replace(easingFunctionPattern, " ").split(/[\s,()]+/)) {
    if (timeLiteralPattern.test(token)) {
      violations.push({ rule: "time-literal", text: token });
    } else if (easingKeywords.has(token.toLowerCase())) {
      violations.push({ rule: "easing-keyword", text: token });
    }
  }
  return violations;
}

/** `transform` 값에서 1이 아닌 `scale*()` 호출을 돌려줍니다. 지금은 비어 있는 결과를 냅니다. */
export function scaleLiteralsIn(value) {
  void value;
  return [];
}

/** CSS 파일 하나의 위반을 `{ line, rule, text }`로 돌려줍니다. 줄 순서로 정렬합니다. */
export function violationsIn(css) {
  const violations = mediaQueriesIn(css).map(({ line }) => ({
    line,
    rule: "media-query",
    text: "@media",
  }));
  for (const { line, value } of motionDeclarationsIn(css)) {
    for (const violation of valueViolations(value)) {
      violations.push({ line, ...violation });
    }
  }
  return violations.sort((a, b) => a.line - b.line);
}

/** 소스 파일 하나의 인라인 모션 위반을 `{ line, rule, text }`로 돌려줍니다. 지금은 비어 있는 결과를 냅니다. */
export function violationsInSource(sourceText, fileName, ts) {
  void sourceText;
  void fileName;
  void ts;
  return [];
}

/** 파일이 없거나 위반이 0인 allowlist 항목을 문장으로 돌려줍니다. */
export function allowlistProblems(allowlist, existingFiles, violationsByFile) {
  const problems = [];
  for (const entry of allowlist) {
    if (!existingFiles.has(entry.path)) {
      problems.push(`${entry.path}: allowlist에 있으나 파일이 없습니다. allowlist에서 지우세요.`);
    } else if ((violationsByFile.get(entry.path) ?? []).length === 0) {
      problems.push(`${entry.path}: allowlist에 있으나 위반이 없습니다. allowlist에서 지우세요.`);
    }
  }
  return problems;
}

/** `[{ path, reason }]` 모양을 검증해 돌려줍니다. 배열이 아니거나 항목이 어긋나면 던집니다. */
export function loadAllowlist(entries) {
  if (!Array.isArray(entries)) {
    throw new Error("allowlist는 [{ path, reason }] 배열이어야 합니다.");
  }
  const isText = (field) => typeof field === "string" && field.trim() !== "";
  const seen = new Set();
  for (const entry of entries) {
    if (
      entry === null ||
      typeof entry !== "object" ||
      !isText(entry.path) ||
      !isText(entry.reason)
    ) {
      throw new Error("allowlist 항목은 비어 있지 않은 path와 reason 문자열이 필요합니다.");
    }
    if (seen.has(entry.path)) {
      throw new Error(`allowlist에 같은 경로가 둘입니다: ${entry.path}`);
    }
    seen.add(entry.path);
  }
  return entries;
}
