// 한글 리터럴 스캐너 — TypeScript AST로 문자열 · 템플릿(통째 하나) · JSX 텍스트만 봅니다.
// 주석은 AST에 없으므로 잡히지 않습니다. `ts`(typescript 모듈)는 인자로 받아 순수하게 유지합니다.

const hangul = /[ᄀ-ᇿ㄰-㆏가-힣]/u;

// 가장 가까운 **최상위** 선언 이름입니다.
function topLevelName(statement, ts) {
  if (ts.isVariableStatement(statement)) {
    const [first] = statement.declarationList.declarations;
    if (first !== undefined && ts.isIdentifier(first.name)) {
      return first.name.text;
    }
    return "";
  }
  if (ts.isExportAssignment(statement)) {
    return "default";
  }
  if (
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  ) {
    return statement.name === undefined ? "default" : statement.name.text;
  }
  return "";
}

/**
 * @param {string} sourceText
 * @param {string} fileName
 * @param {any} ts 인자로 받는 typescript 모듈(순수 유지)
 * @returns {{ line: number, text: string, declaration: string, inErrorConstructor: boolean }[]}
 */
export function koreanLiteralsIn(sourceText, fileName, ts) {
  const scriptKind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const found = [];

  function record(node, text, declaration, inError) {
    if (!hangul.test(text)) {
      return;
    }
    const start = node.getStart(source);
    found.push({
      line: source.getLineAndCharacterOfPosition(start).line + 1,
      text,
      declaration,
      inErrorConstructor: inError,
    });
  }

  function visit(node, declaration, inError) {
    let nextError = inError;
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "Error"
    ) {
      nextError = true;
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      record(node, node.text, declaration, nextError);
      return;
    }
    if (ts.isTemplateExpression(node)) {
      record(node, node.getText(source), declaration, nextError);
      // 조각은 통째 한 건으로 셌으니 식 안의 리터럴만 더 봅니다.
      for (const span of node.templateSpans) {
        visit(span.expression, declaration, nextError);
      }
      return;
    }
    if (node.kind === ts.SyntaxKind.JsxText) {
      record(node, node.text.trim(), declaration, nextError);
      return;
    }
    ts.forEachChild(node, (child) => visit(child, declaration, nextError));
  }

  for (const statement of source.statements) {
    visit(statement, topLevelName(statement, ts), false);
  }
  return found;
}
