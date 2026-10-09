// 소스 모션 스캐너 — `.ts` · `.tsx`의 인라인 스타일에서 모션 선언을 찾습니다(순수).

import { motionDeclarationsIn } from "./scan.mjs";

/** 객체 스타일의 camelCase 이름과 CSS의 kebab 이름 짝입니다. */
export const motionPropertyNames = [
  { camel: "transition", kebab: "transition" },
  { camel: "transitionDuration", kebab: "transition-duration" },
  { camel: "transitionDelay", kebab: "transition-delay" },
  { camel: "transitionTimingFunction", kebab: "transition-timing-function" },
  { camel: "animation", kebab: "animation" },
  { camel: "animationDuration", kebab: "animation-duration" },
  { camel: "animationDelay", kebab: "animation-delay" },
  { camel: "animationTimingFunction", kebab: "animation-timing-function" },
];

const kebabByName = new Map(
  motionPropertyNames.flatMap(({ camel, kebab }) => [
    [camel, kebab],
    [kebab, kebab],
  ]),
);

/** 속성 이름 노드가 식별자나 문자열이면 그 글자를 돌려줍니다. */
function nameOf(name, ts) {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
}

/** 문자열 계열 초기값의 텍스트를 돌려줍니다. 템플릿은 리터럴 조각만 공백으로 잇고, 그 밖은 undefined입니다. */
function literalText(node, ts) {
  // `"…" as const` · `("…")` 같은 감싸기는 벗겨서 봅니다 — 단언 · 괄호로 검사를 피하지 못하게.
  while (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) {
    node = node.expression;
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" ");
  }
  return undefined;
}

/**
 * 소스 텍스트의 인라인 모션 선언을 `{ line, property, value, origin }`로 돌려줍니다.
 * 객체 리터럴의 모션 속성 문자열 값(`object`)과 JSX `style` 문자열 속성(`style-string`)을 봅니다.
 * 식별자 · 호출 같은 비리터럴 값은 건너뜁니다.
 */
export function inlineMotionDeclarationsIn(sourceText, fileName, ts) {
  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true);
  const lineOf = (node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const found = [];

  const visit = (node) => {
    if (ts.isPropertyAssignment(node)) {
      const property = kebabByName.get(nameOf(node.name, ts) ?? "");
      const value = property === undefined ? undefined : literalText(node.initializer, ts);
      if (property !== undefined && value !== undefined) {
        found.push({ line: lineOf(node.name), property, value, origin: "object" });
      }
    } else if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "style" &&
      node.initializer !== undefined &&
      ts.isStringLiteral(node.initializer)
    ) {
      const base = lineOf(node.initializer) - 1;
      for (const declaration of motionDeclarationsIn(node.initializer.text)) {
        found.push({
          line: base + declaration.line,
          property: declaration.property,
          value: declaration.value,
          origin: "style-string",
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found.sort((a, b) => a.line - b.line);
}
