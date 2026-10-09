// host-status-bar-icons.mjs의 보조 모듈 — 소스 문자열을 훑는 작은 도구들.
// 순수 함수 — 파일을 읽지 않고 던지지 않는다. 의존성 없이 문자열로 처리한다(선례: host-launch-appearance.resources.mjs).

/** 문자열이 아니면 빈 문자열로 본다. */
export function text(value) {
  return typeof value === "string" ? value : "";
}

/** 블록 주석과 줄 주석을 지운다(`://` 같은 URL의 슬래시 둘은 줄 주석으로 보지 않는다). */
export function stripComments(source) {
  return text(source)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'\w])\/\/[^\n]*/g, "$1");
}

/** 여는 괄호 위치부터 짝이 맞는 닫는 괄호의 위치를 찾는다. 못 찾으면 -1. */
export function matchingClose(source, openIndex, open, close) {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === open) depth += 1;
    else if (source[index] === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/** `name(...) {` 꼴 메서드 · 함수의 본문. 없으면 null. */
export function methodBody(source, name) {
  const header = new RegExp(`\\b${name}\\s*\\([^)]*\\)[^{;]*\\{`).exec(source);
  if (header === null) return null;
  const open = header.index + header[0].length - 1;
  const close = matchingClose(source, open, "{", "}");
  return close === -1 ? null : source.slice(open + 1, close);
}

/** `.post(...)` · `.postDelayed(...)` 호출을 통째로 지운다. */
export function withoutPostCalls(body) {
  let rest = body;
  for (;;) {
    const call = /\.post\w*\s*\(/.exec(rest);
    if (call === null) return rest;
    const open = call.index + call[0].length - 1;
    const close = matchingClose(rest, open, "(", ")");
    rest = rest.slice(0, call.index) + (close === -1 ? "" : rest.slice(close + 1));
  }
}

/** JSX 여는 태그의 `<`에서 `>`까지(중괄호 · 따옴표 안의 `>`는 건너뛴다). */
export function jsxOpeningTagAt(source, start) {
  let depth = 0;
  let quote = "";
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote !== "") {
      if (char === quote) quote = "";
    } else if (char === '"' || char === "'") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    else if (char === ">" && depth === 0) return source.slice(start, index + 1);
  }
  return source.slice(start);
}

/** `className="…"`에 그 클래스를 가진 JSX 여는 태그들의 원문. */
export function openingTagsWithClass(source, className) {
  const tags = [];
  const pattern = new RegExp(`className\\s*=\\s*"[^"]*\\b${className}\\b[^"]*"`, "g");
  for (const match of source.matchAll(pattern)) {
    const start = source.lastIndexOf("<", match.index);
    if (start !== -1) tags.push(jsxOpeningTagAt(source, start));
  }
  return tags;
}
