// 소스 한 파일에서 import 이름과 전역 식별자 참조를 뽑습니다(TypeScript 구문 트리 — 주석 · 문자열 속 글자는 세지 않음).
// `.astro`는 구문 트리 없이 import 문만 글자로 읽습니다(랜딩은 app 층이라 방향 규칙 D2만 봅니다).

/** 시간 · 난수 멤버 — `crypto.*`는 따로 통째로 봅니다. */
const NONDETERMINISTIC_MEMBERS = new Set(["Date.now", "Math.random", "performance.now"]);

/** @param {typeof import("typescript")} ts */
export function scanSource(ts, fileName, text) {
  if (fileName.endsWith(".astro"))
    return { imports: astroImports(text), globals: [], nondeterministic: [] };
  const kind = fileName.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : fileName.endsWith(".ts") || fileName.endsWith(".mts")
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS;
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind);
  const lineOf = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const imports = [];
  const references = [];
  // 결과가 실행마다 달라지는 호출(시간 · 난수) — core는 이것을 인자로 받습니다(D5).
  const nondeterministic = [];
  const declared = new Set();

  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push({ name: node.moduleSpecifier.text, line: lineOf(node) });
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const callee = node.expression;
      if (
        callee.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(callee) && callee.text === "require")
      )
        imports.push({ name: node.arguments[0].text, line: lineOf(node) });
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      imports.push({ name: node.argument.literal.text, line: lineOf(node) });
    }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      const call = `${node.expression.text}.${node.name.text}`;
      if (NONDETERMINISTIC_MEMBERS.has(call) || node.expression.text === "crypto")
        nondeterministic.push({ name: call, line: lineOf(node) });
    } else if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "Date" &&
      (node.arguments?.length ?? 0) === 0
    ) {
      nondeterministic.push({ name: "new Date()", line: lineOf(node) });
    }
    if (ts.isIdentifier(node)) {
      if (isDeclarationName(ts, node)) declared.add(node.text);
      else if (isValueReference(ts, node)) references.push({ name: node.text, line: lineOf(node) });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  // 파일 안에서 같은 이름을 선언했으면(매개변수 · 지역 변수) 전역이 아닙니다.
  return {
    imports,
    globals: references.filter(({ name }) => !declared.has(name)),
    nondeterministic: nondeterministic.filter(({ name }) => !declared.has(name.split(".")[0])),
  };
}

function isDeclarationName(ts, node) {
  const parent = node.parent;
  return (
    (ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isBindingElement(parent) ||
      ts.isImportSpecifier(parent) ||
      ts.isImportClause(parent) ||
      ts.isNamespaceImport(parent)) &&
    parent.name === node
  );
}

/** 값 · 타입 자리의 식별자 참조인가 — 속성 이름(`a.window`) · 객체 키 · 타입 멤버 이름은 아닙니다. */
function isValueReference(ts, node) {
  const parent = node.parent;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (ts.isQualifiedName(parent) && parent.right === node) return false;
  // `const { window: w } = o`의 `window`는 가져올 속성 이름 — 선언도 전역 참조도 아닙니다(리뷰 #439).
  if (ts.isBindingElement(parent) && parent.propertyName === node) return false;
  if (
    (ts.isPropertyAssignment(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isEnumMember(parent)) &&
    parent.name === node
  )
    return false;
  if (ts.isShorthandPropertyAssignment(parent)) return true;
  if (
    ts.isExportSpecifier(parent) ||
    ts.isLabeledStatement(parent) ||
    ts.isBreakOrContinueStatement(parent)
  )
    return false;
  if (
    ts.isTypeAliasDeclaration(parent) ||
    ts.isInterfaceDeclaration(parent) ||
    ts.isTypeParameterDeclaration(parent)
  )
    return false;
  return true;
}

/** `.astro` — 프런트매터와 `<script>`의 import 문만(정규식). */
export function astroImports(text) {
  const out = [];
  // 여러 줄 import(포매터가 펼친 것)도 잡도록 글 전체에서 찾고, 줄 번호는 import · export 키워드가 시작한 줄입니다(리뷰 #439).
  const pattern =
    /(?:^|[\s>;])((?:import|export)\b[^"'`]*?from\s*["']([^"']+)["']|import\s*\(?\s*["']([^"']+)["'])/g;
  for (const match of text.matchAll(pattern)) {
    const name = match[2] ?? match[3];
    if (name === undefined) continue;
    const start = match.index + match[0].indexOf(match[1]);
    out.push({ name, line: text.slice(0, start).split("\n").length });
  }
  return out;
}
