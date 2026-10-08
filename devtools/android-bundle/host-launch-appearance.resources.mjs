// android-launch-appearance 계약 7절의 보조 모듈 — res/values 한정자 선택, 스타일 부모 사슬, 색 별칭 풀이.
// 순수 함수 — 파일을 읽지 않고 던지지 않는다. 의존성 없이 문자열로 처리한다(선례: host-config-changes.mjs).

const VALUES_DIR = /^values(?:-v(\d+))?$/;
const PLATFORM_PARENT = /^@?android:(?:style\/)?(.+)$/;

/** XML 주석을 지운다. */
export function stripXmlComments(xml) {
  return typeof xml === "string" ? xml.replace(/<!--[\s\S]*?-->/g, "") : "";
}

/** 시작 태그 안 속성을 이름(접두사 포함) → 값으로 읽는다. */
function readAttributes(tag) {
  const attributes = new Map();
  for (const match of tag.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) {
    if (!attributes.has(match[1])) attributes.set(match[1], match[2]);
  }
  return attributes;
}

/**
 * `values` · `values-vNN` 폴더의 파일만 한정자 수준(없음=0) 오름차순으로 준다.
 * `values-night*` · 로캘 등 다른 한정자는 API 수준 선택에서 제외한다.
 * @param {Readonly<Record<string, string>>} files
 * @returns {{ path: string, level: number, xml: string }[]}
 */
export function valuesFiles(files) {
  const found = [];
  for (const [path, xml] of Object.entries(files ?? {})) {
    const parts = path.split("/");
    if (parts.length !== 2 || typeof xml !== "string") continue;
    const match = VALUES_DIR.exec(parts[0]);
    if (match) found.push({ path, level: match[1] ? Number(match[1]) : 0, xml });
  }
  return found.sort((a, b) => a.level - b.level);
}

/**
 * `<style>` 선언을 읽는다. 항목 이름은 XML에 적힌 그대로(`android:windowBackground`).
 * @param {string} xml
 * @returns {{ name: string, parent: string | undefined, items: [string, string][] }[]}
 */
export function parseStyles(xml) {
  const styles = [];
  for (const match of stripXmlComments(xml).matchAll(
    /<style\b([^>]*?)(?:\/>|>([\s\S]*?)<\/style>)/g,
  )) {
    const attributes = readAttributes(match[1]);
    const name = attributes.get("name");
    if (name === undefined) continue;
    const items = [];
    for (const item of (match[2] ?? "").matchAll(/<item\b([^>]*?)(?<!\/)>([\s\S]*?)<\/item>/g)) {
      const itemName = readAttributes(item[1]).get("name");
      if (itemName !== undefined) items.push([itemName, item[2].trim()]);
    }
    styles.push({ name, parent: attributes.get("parent"), items });
  }
  return styles;
}

/** 그 API 수준에서 보이는 스타일 — 높은 한정자의 같은 이름 스타일이 통째로 대체한다(합치지 않는다). */
function visibleStyles(files, apiLevel) {
  const styles = new Map();
  for (const file of valuesFiles(files)) {
    if (file.level > apiLevel) continue;
    for (const style of parseStyles(file.xml)) styles.set(style.name, style);
  }
  return styles;
}

/** 부모 지정 → `{ platform }` | `{ name }` | null(부모 없음). 명시 속성이 없으면 점으로 끊은 이름이 부모다. */
function parentOf(styleName, explicit) {
  if (explicit === undefined) {
    const dot = styleName.lastIndexOf(".");
    return dot > 0 ? { name: styleName.slice(0, dot) } : null;
  }
  const value = explicit.trim();
  if (value === "") return null;
  const platform = PLATFORM_PARENT.exec(value);
  if (platform) return { platform: `@android:style/${platform[1]}` };
  return { name: value.replace(/^@style\//, "") };
}

/**
 * 부모 사슬을 걷는다. 자식 → 루트 순의 스타일과, 사슬의 끝(플랫폼 스타일 또는 이유).
 * @returns {{ chain: ReturnType<typeof parseStyles>, end: string | null, problem: string | null }}
 */
function walkChain(styles, styleName) {
  const chain = [];
  const seen = new Set();
  let name = styleName;
  while (name !== undefined) {
    if (seen.has(name)) return { chain, end: null, problem: `parent cycle at ${name}` };
    seen.add(name);
    const style = styles.get(name);
    if (!style) return { chain, end: null, problem: `style not found: ${name}` };
    chain.push(style);
    const parent = parentOf(name, style.parent);
    if (parent === null) return { chain, end: null, problem: `chain ends at ${name}` };
    if (parent.platform) return { chain, end: parent.platform, problem: null };
    name = parent.name;
  }
  return { chain, end: null, problem: "no style" };
}

/**
 * 그 API 수준에서 고르는 한정자의 스타일을 부모 사슬과 합친다. 없는 스타일이면 빈 Map.
 * @param {Readonly<Record<string, string>>} files
 * @param {string} styleName
 * @param {number} apiLevel
 * @returns {Map<string, string>}
 */
export function resolvedThemeItems(files, styleName, apiLevel) {
  const { chain } = walkChain(visibleStyles(files, apiLevel), styleName);
  const items = new Map();
  for (const style of [...chain].reverse()) {
    for (const [name, value] of style.items) items.set(name, value);
  }
  return items;
}

/**
 * 부모 사슬의 끝이 어디인지. 플랫폼 스타일에서 끝나면 `end`, 아니면 `end` null과 이유.
 * @param {Readonly<Record<string, string>>} files
 * @param {string} styleName
 * @param {number} apiLevel
 * @returns {{ end: string | null, problem: string | null }}
 */
export function themeParentEnd(files, styleName, apiLevel) {
  const { end, problem } = walkChain(visibleStyles(files, apiLevel), styleName);
  return { end, problem };
}

/** 색 값 문자열 → 대문자 `#RRGGBB` | 별칭 이름 | null(반투명 · 형식 오류). */
function colorLiteral(value) {
  const hex = /^#([0-9a-fA-F]+)$/.exec(value);
  if (!hex) return null;
  let digits = hex[1].toUpperCase();
  if (digits.length === 3 || digits.length === 4) {
    digits = [...digits].map((digit) => digit + digit).join("");
  }
  if (digits.length === 8) {
    if (!digits.startsWith("FF")) return null;
    digits = digits.slice(2);
  }
  return digits.length === 6 ? `#${digits}` : null;
}

/**
 * `@color/…` 별칭을 끝까지 풀어 대문자 `#RRGGBB`를 준다. `#AARRGGBB`는 알파가 FF일 때만 받는다.
 * 못 풀면(없음 · 순환 · 반투명) null.
 * @param {Readonly<Record<string, string>>} files
 * @param {string} colorName
 * @returns {string | null}
 */
export function resolvedColor(files, colorName) {
  const colors = new Map();
  for (const file of valuesFiles(files)) {
    for (const match of stripXmlComments(file.xml).matchAll(
      /<color\b([^>]*?)(?<!\/)>([\s\S]*?)<\/color>/g,
    )) {
      const name = readAttributes(match[1]).get("name");
      if (name !== undefined) colors.set(name, match[2].trim());
    }
  }

  const seen = new Set();
  let name = colorName;
  while (colors.has(name) && !seen.has(name)) {
    seen.add(name);
    const value = colors.get(name);
    const alias = /^@color\/(.+)$/.exec(value);
    if (!alias) return colorLiteral(value);
    name = alias[1];
  }
  return null;
}
