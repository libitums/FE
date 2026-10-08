// 정본은 android-abi-minify 계약 r02.1과 test-plan의 pureFunctions · r02-1. 순수 함수 — 파일을 읽지 않는다.

/**
 * @typedef {object} BuildTypeSettings
 * @property {boolean} declared `buildTypes` 안에 그 이름의 블록이 있는가
 * @property {boolean | null} minifyEnabled 선언이 없으면 null (「없음」과 false를 가른다)
 * @property {boolean | null} shrinkResources 선언이 없으면 null
 * @property {string[] | null} proguardFiles 순서대로. `getDefaultProguardFile('x')`는 `"default:x"`
 * @property {string | null} initWith 물려받는 buildType 이름. 물려받은 값은 풀지 않는다
 */

/**
 * @typedef {object} ExpectedMappingClass
 * @property {string} className 원래 클래스 이름(점 표기)
 * @property {readonly string[]} members 그 클래스에서 이름이 남아야 하는 메서드
 */

/** 블록 주석과 줄 끝까지의 `//`를 지운다(URL의 `://`는 남긴다). */
function withoutGradleComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** `text`에서 `open` 위치의 `{`와 짝이 되는 `}`의 위치를 돌려준다. 없으면 -1. */
function matchingBrace(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** `{ … }`로 열리는 이름 붙은 블록의 안쪽을 돌려준다(`topLevel`이면 깊이 0에서 처음 찾은 것). 없으면 null. */
function namedBlockBody(text, name, topLevel = true) {
  const pattern = new RegExp(`(^|[\\s;}])${name}\\s*\\{`, "g");
  let depth = 0;
  let last = 0;
  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    for (let i = last; i < match.index + match[1].length; i += 1) {
      if (text[i] === "{") depth += 1;
      else if (text[i] === "}") depth -= 1;
    }
    last = match.index + match[1].length;
    if (!topLevel || depth === 0) {
      const open = match.index + match[0].length - 1;
      const close = matchingBrace(text, open);
      return close < 0 ? null : text.slice(open + 1, close);
    }
  }
  return null;
}

/** 블록 안쪽에서 중첩 블록을 지운다(깊이 0의 선언만 남긴다). */
function topLevelOnly(body) {
  let depth = 0;
  let out = "";
  for (const ch of body) {
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    else if (depth === 0) out += ch;
  }
  return out;
}

/**
 * `build.gradle`의 `buildTypes { <name> { … } }` 블록이 선언한 값을 읽는다.
 * @param {string} gradleText `build.gradle` 전문
 * @param {string} name buildType 이름
 * @returns {BuildTypeSettings}
 */
export function buildTypeSettings(gradleText, name) {
  const text = withoutGradleComments(gradleText);
  const buildTypes = namedBlockBody(text, "buildTypes", false);
  const block = buildTypes === null ? null : namedBlockBody(buildTypes, name);
  const settings = {
    declared: block !== null,
    minifyEnabled: null,
    shrinkResources: null,
    proguardFiles: null,
    initWith: null,
  };
  if (block === null) return settings;
  const body = topLevelOnly(block);
  const flag = (key) => {
    const match = new RegExp(`(?:^|\\s)${key}\\s*=?\\s*(true|false)\\b`).exec(body);
    return match === null ? null : match[1] === "true";
  };
  settings.minifyEnabled = flag("minifyEnabled");
  settings.shrinkResources = flag("shrinkResources");
  const files = /(?:^|\s)proguardFiles?\s*(?:=\s*)?(.*)$/m.exec(body);
  if (files !== null) {
    settings.proguardFiles = [
      ...files[1].matchAll(/getDefaultProguardFile\(\s*(['"])([^'"]+)\1\s*\)|(['"])([^'"]+)\3/g),
    ].map((m) => (m[2] !== undefined ? `default:${m[2]}` : m[4]));
  }
  const init = /(?:^|\s)initWith\s*=?\s*['"]?([\w-]+)['"]?/.exec(body);
  settings.initWith = init === null ? null : init[1];
  return settings;
}

/**
 * zip 항목 이름(AAB · APK)에서 싣는 ABI와 ABI별 `.so` 수를 센다.
 * @param {readonly string[]} entryNames
 * @returns {{ abis: string[], libraries: Record<string, number> }} `abis`는 정렬
 */
export function packagedAbis(entryNames) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const entry of entryNames) {
    const match = /^(?:base\/)?lib\/([^/]+)\/[^/]+\.so$/.exec(entry);
    if (match !== null) counts[match[1]] = (counts[match[1]] ?? 0) + 1;
  }
  const abis = Object.keys(counts).sort();
  return { abis, libraries: Object.fromEntries(abis.map((abi) => [abi, counts[abi]])) };
}

/**
 * keep 규칙이 덮지 못한 네이티브 콜백 어노테이션을 찾는다.
 * @param {{ annotations: readonly string[], rules: readonly string[] }} input
 *   `annotations`는 FQN(점 표기), `rules`는 규칙 파일 본문
 * @returns {string[]} 덮이지 않은 FQN(정렬). 없으면 빈 배열
 */
export function uncoveredNativeCallbackAnnotations(input) {
  const keepRules = [];
  for (const file of input.rules) {
    const text = file.replace(/#.*$/gm, "");
    for (const rule of text.split(/^\s*(?=-[A-Za-z])/m)) {
      if (/^\s*-keep/.test(rule)) keepRules.push(rule);
    }
  }
  const names = (rule) => new Set([...rule.matchAll(/@([\w.$]+)/g)].map((m) => m[1]));
  const covered = new Set(keepRules.flatMap((rule) => [...names(rule)]));
  return [...new Set(input.annotations)].filter((fqn) => !covered.has(fqn)).sort();
}

/**
 * Lynx 모듈 소스에서 `@LynxMethod`가 붙은 메서드 이름을 모은다.
 * @param {string} javaSource Java 소스 한 파일
 * @returns {string[]} 소스 순서 · 중복 제거. 없으면 빈 배열
 */
export function lynxModuleMethods(javaSource) {
  const text = withoutGradleComments(javaSource);
  const pattern = /@LynxMethod\b(?:\s*\([^)]*\))?\s+(?:@\w+(?:\([^)]*\))?\s+)*[^;{(]*?(\w+)\s*\(/g;
  const names = [];
  for (const match of text.matchAll(pattern)) {
    if (!names.includes(match[1])) names.push(match[1]);
  }
  return names;
}

/**
 * R8 `mapping.txt`에서 이름이 남아야 할 클래스 · 메서드가 지워지거나 바뀌었는지 본다.
 * 한계: 이름만 본다(오버로드 가운데 하나만 남아도 통과).
 * @param {string} mappingText `mapping.txt` 전문
 * @param {readonly ExpectedMappingClass[]} expected
 * @returns {string[]} 문제 문자열(정렬). 없으면 빈 배열
 */
export function mappingIssues(mappingText, expected) {
  /** @type {Map<string, { obfuscated: string, methods: Map<string, Set<string>> }>} */
  const classes = new Map();
  let current = null;
  for (const line of mappingText.split("\n")) {
    if (line.startsWith("#") || line.trim() === "") continue;
    if (!/^\s/.test(line)) {
      const match = /^(\S+) -> (\S+):\s*$/.exec(line);
      current = null;
      if (match !== null) {
        current = { obfuscated: match[2], methods: new Map() };
        classes.set(match[1], current);
      }
      continue;
    }
    if (current === null) continue;
    const split = line.lastIndexOf(" -> ");
    const paren = line.indexOf("(");
    if (split < 0 || paren < 0 || paren > split) continue;
    const name = line.slice(0, paren).trim().split(/\s+/).pop();
    if (name === undefined || name.includes(".")) continue;
    const obfuscated = line.slice(split + 4).trim();
    if (!current.methods.has(name)) current.methods.set(name, new Set());
    current.methods.get(name)?.add(obfuscated);
  }

  const issues = [];
  for (const { className, members } of expected) {
    const entry = classes.get(className);
    if (entry === undefined) {
      issues.push(`class-missing ${className}`);
      continue;
    }
    if (entry.obfuscated !== className) {
      issues.push(`class-renamed ${className} -> ${entry.obfuscated}`);
      continue;
    }
    for (const member of members) {
      const obfuscated = entry.methods.get(member);
      if (obfuscated === undefined) issues.push(`member-missing ${className}.${member}`);
      else if (!obfuscated.has(member)) {
        issues.push(`member-renamed ${className}.${member} -> ${[...obfuscated].join(",")}`);
      }
    }
  }
  return issues.sort();
}
