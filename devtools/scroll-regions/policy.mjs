// 스크롤 바 규칙 정책입니다. 대상 루트와 판정 함수만 둡니다(순수).

export const scrollBarPolicy = {
  roots: ["apps/mobile/src", "packages/ui-lynx/src", "apps/storybook-lynx/src"],
  // 스캔하지 않는 파일. 테스트는 규칙의 대상이 아닙니다.
  excludedFile: /\.test\.tsx?$/,
};

/**
 * @typedef {"missing" | "enabled" | "not-literal" | "spread"} ScrollBarRule
 */

/**
 * @param {import("./scan.mjs").ScrollElement[]} elements
 * @returns {{ line: number, rule: ScrollBarRule, message: string }[]} 줄 오름차순
 */
export function scrollBarViolationsFrom(elements) {
  const fix = "scroll-bar-enable={false}를 적으세요.";
  const violations = [];
  for (const element of elements) {
    if (element.scrollBar === "missing") {
      violations.push({
        line: element.line,
        rule: "missing",
        message: `<${element.tag}>에 scroll-bar-enable이 없습니다. ${fix}`,
      });
    } else if (element.scrollBar === "true") {
      violations.push({
        line: element.line,
        rule: "enabled",
        message: `<${element.tag}>가 스크롤 바를 켜 둡니다. ${fix}`,
      });
    } else if (element.scrollBar === "not-literal") {
      violations.push({
        line: element.line,
        rule: "not-literal",
        message: `<${element.tag}>의 scroll-bar-enable이 글자 그대로 false가 아닙니다. ${fix}`,
      });
    }
    // 뒤에 적힌 속성이 이기므로, 글자 그대로의 스위치보다 앞선 스프레드는 값을 덮지 못한다.
    if (element.spreadAfterSwitch) {
      violations.push({
        line: element.line,
        rule: "spread",
        message: `<${element.tag}>의 스프레드 속성이 scroll-bar-enable을 덮을 수 있습니다. 스프레드를 scroll-bar-enable보다 앞에 두고 ${fix}`,
      });
    }
  }
  return violations.sort((a, b) => a.line - b.line);
}
