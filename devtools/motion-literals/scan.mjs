// 모션 선언 스캐너 — CSS 텍스트에서 시간 · 이징을 정하는 선언과 `@media`를 찾습니다(순수).

/** 시간 · 이징을 정하는 속성입니다. 이 속성의 선언만 리터럴 검사 대상입니다. */
export const motionProperties = [
  "transition",
  "transition-duration",
  "transition-delay",
  "transition-timing-function",
  "animation",
  "animation-duration",
  "animation-delay",
  "animation-timing-function",
];

/** 블록 주석을 같은 길이의 공백으로 바꿉니다. 개행은 남겨 줄 번호를 지킵니다. */
export function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, (comment) => comment.replace(/[^\n]/g, " "));
}

/** `index` 앞까지의 개행 수로 1부터 시작하는 줄 번호를 구합니다. */
function lineAt(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text[cursor] === "\n") {
      line += 1;
    }
  }
  return line;
}

/**
 * 주석을 벗긴 CSS를 `{`, `}`, `;` 경계로 잘라 선언 후보를 만듭니다. 괄호 안의 경계는 무시합니다.
 * `{`로 끝나는 조각은 선택자나 at-rule이라 선언이 아니므로 버립니다.
 */
function declarationSegments(css) {
  const segments = [];
  let depth = 0;
  let start = 0;
  for (let cursor = 0; cursor < css.length; cursor += 1) {
    const char = css[cursor];
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0 && (char === "{" || char === "}" || char === ";")) {
      if (char !== "{") {
        segments.push({ text: css.slice(start, cursor), start });
      }
      start = cursor + 1;
    }
  }
  segments.push({ text: css.slice(start), start });
  return segments;
}

/** 모션 속성 선언을 `{ line, property, value }`로 돌려줍니다. 여러 줄 값은 합칩니다. */
export function motionDeclarationsIn(css) {
  const stripped = stripComments(css);
  const found = [];
  for (const segment of declarationSegments(stripped)) {
    const colon = segment.text.indexOf(":");
    if (colon === -1) {
      continue;
    }
    const property = segment.text.slice(0, colon).trim().toLowerCase();
    if (!motionProperties.includes(property)) {
      continue;
    }
    const leading = segment.text.length - segment.text.trimStart().length;
    found.push({
      line: lineAt(stripped, segment.start + leading),
      property,
      value: segment.text
        .slice(colon + 1)
        .replace(/\s+/g, " ")
        .trim(),
    });
  }
  return found;
}

/** `@media`가 나오는 줄을 `{ line }`로 돌려줍니다. 주석 안은 보지 않습니다. */
export function mediaQueriesIn(css) {
  const stripped = stripComments(css);
  return [...stripped.matchAll(/@media\b/gi)].map((match) => ({
    line: lineAt(stripped, match.index),
  }));
}

/** `transform` 선언을 `{ line, property, value }`로 돌려줍니다. 지금은 비어 있는 결과를 냅니다. */
export function transformDeclarationsIn(css) {
  void css;
  return [];
}
