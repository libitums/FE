// 스크롤 요소 스캐너 — TypeScript AST에서 `<scroll-view>` · `<list>`를 찾아 `scroll-bar-enable`의 모양을 읽습니다.
// 주석 · 문자열 안의 태그는 AST에 요소로 없으므로 세지 않습니다. `ts`(typescript 모듈)는 인자로 받아 순수하게 유지합니다.

/**
 * @typedef {"false" | "true" | "missing" | "not-literal"} ScrollBarSetting
 *   "false"       scroll-bar-enable={false}
 *   "true"        scroll-bar-enable={true} 또는 값 없는 속성
 *   "missing"     속성이 없다
 *   "not-literal" 문자열("false" 포함) · 변수 · 삼항 등 그 밖의 식
 * @typedef {{ line: number, tag: "scroll-view" | "list", scrollBar: ScrollBarSetting, spread: boolean, spreadAfterSwitch: boolean }} ScrollElement
 */

/**
 * `spreadAfterSwitch` — JSX에서는 뒤에 적힌 속성이 이긴다. 마지막 `scroll-bar-enable`보다 뒤에 스프레드가 있거나
 * (스위치가 없을 때는 스프레드가 어디에 있든) 스프레드가 값을 덮을 수 있으면 true다.
 *
 * @param {string} sourceText
 * @param {string} fileName 확장자로 TSX 여부를 정합니다
 * @param {any} ts 인자로 받는 typescript 모듈(순수 유지)
 * @returns {ScrollElement[]} 소스에 나온 순서대로. 여는 태그와 스스로 닫는 태그를 둘 다 셉니다
 */
export function scrollElementsIn(sourceText, fileName, ts) {
  const scriptKind = /\.tsx$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  /** @type {ScrollElement[]} */
  const found = [];

  /** @param {any} initializer */
  function settingOf(initializer) {
    if (initializer === undefined) {
      return "true";
    }
    if (initializer.kind === ts.SyntaxKind.JsxExpression) {
      const expression = initializer.expression;
      if (expression?.kind === ts.SyntaxKind.FalseKeyword) {
        return "false";
      }
      if (expression?.kind === ts.SyntaxKind.TrueKeyword) {
        return "true";
      }
    }
    return "not-literal";
  }

  /** @param {any} node */
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sourceFile);
      if (tag === "scroll-view" || tag === "list") {
        let scrollBar = "missing";
        let spread = false;
        let spreadAfterSwitch = false;
        let hasSwitch = false;
        for (const attribute of node.attributes.properties) {
          if (ts.isJsxSpreadAttribute(attribute)) {
            spread = true;
            spreadAfterSwitch = true;
          } else if (attribute.name.getText(sourceFile) === "scroll-bar-enable") {
            scrollBar = settingOf(attribute.initializer);
            hasSwitch = true;
            spreadAfterSwitch = false;
          }
        }
        if (!hasSwitch && spread) {
          spreadAfterSwitch = true;
        }
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        found.push({ line: line + 1, tag, scrollBar, spread, spreadAfterSwitch });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}
