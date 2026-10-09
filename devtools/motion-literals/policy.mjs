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

/** 파일 하나의 위반을 `{ line, rule, text }`로 돌려줍니다. 줄 순서로 정렬합니다. */
export function violationsIn(css, fileName) {
  void fileName;
  const violations = mediaQueriesIn(css).map(({ line }) => ({
    line,
    rule: "media-query",
    text: "@media",
  }));
  for (const { line, value } of motionDeclarationsIn(css)) {
    const remaining = stripTokenReferences(value);
    for (const match of remaining.matchAll(easingFunctionPattern)) {
      violations.push({ line, rule: "easing-function", text: match[0] });
    }
    for (const token of remaining.replace(easingFunctionPattern, " ").split(/[\s,]+/)) {
      if (timeLiteralPattern.test(token)) {
        violations.push({ line, rule: "time-literal", text: token });
      } else if (easingKeywords.has(token.toLowerCase())) {
        violations.push({ line, rule: "easing-keyword", text: token });
      }
    }
  }
  return violations.sort((a, b) => a.line - b.line);
}

function violationCountOf(violationsByFile, filePath) {
  const violations =
    violationsByFile instanceof Map ? violationsByFile.get(filePath) : violationsByFile[filePath];
  return violations === undefined ? 0 : violations.length;
}

/** 파일이 없거나 위반이 0인 allowlist 항목을 문장으로 돌려줍니다. */
export function allowlistProblems(allowlist, existingFiles, violationsByFile) {
  const existing = new Set(existingFiles);
  const problems = [];
  for (const entry of allowlist) {
    if (!existing.has(entry.path)) {
      problems.push(`${entry.path}: allowlist에 있으나 파일이 없습니다. allowlist에서 지우세요.`);
    } else if (violationCountOf(violationsByFile, entry.path) === 0) {
      problems.push(`${entry.path}: allowlist에 있으나 위반이 없습니다. allowlist에서 지우세요.`);
    }
  }
  return problems;
}

/** `[{ path, reason }]` 모양을 검증해 돌려줍니다. JSON 문자열도 받습니다. 어긋나면 던집니다. */
export function loadAllowlist(json) {
  const entries = typeof json === "string" ? JSON.parse(json) : json;
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
