// integration 테스트가 「화면에 한글이 어디에 있는가」를 묻는 도우미입니다. 제품 코드가
// import하지 않습니다. 정규식은 이스케이프로 적어 한글 리터럴을 이 파일에 두지 않습니다
// (자모 · 호환 자모 · 음절).

const hangulPattern = /[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯ힰ-퟿]/;

/** 학습 콘텐츠 자리의 `data-testid` — 문자열은 정확히 같은 것, 정규식은 일치하는 것입니다. */
export type ContentTestId = string | RegExp;

export type HangulFinding = { readonly where: string; readonly text: string };

function testIdOf(element: Element): string | null {
  return element.getAttribute("data-testid");
}

function describeElement(element: Element): string {
  const testId = testIdOf(element);
  if (testId !== null) return `[data-testid=${testId}]`;
  const className = element.getAttribute("class");
  return className === null ? element.tagName.toLowerCase() : `.${className.split(" ")[0] ?? ""}`;
}

// 요소가 직접 갖는 텍스트(자식 텍스트 노드)와 접근성 이름 중 한글이 든 것을 모읍니다.
function ownHangulStrings(element: Element): string[] {
  const strings: string[] = [];
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === 3 && node.textContent !== null) strings.push(node.textContent);
  }
  const label = element.getAttribute("accessibility-label");
  if (label !== null) strings.push(label);
  return strings.filter((text) => hangulPattern.test(text));
}

function isContent(
  element: Element,
  container: Element,
  contentTestIds: readonly ContentTestId[],
): boolean {
  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    const testId = testIdOf(node);
    if (
      testId !== null &&
      contentTestIds.some((id) => (typeof id === "string" ? id === testId : id.test(testId)))
    ) {
      return true;
    }
    if (node === container) break;
  }
  return false;
}

/**
 * 콘텐츠 자리(`contentTestIds` 아래) 밖에서 한글이 든 텍스트 노드 · `accessibility-label`을
 * 자리와 함께 돌려줍니다. 없으면 빈 배열입니다.
 */
export function hangulOutside(
  container: Element,
  contentTestIds: readonly ContentTestId[],
): readonly HangulFinding[] {
  const findings: HangulFinding[] = [];
  for (const element of [container, ...Array.from(container.querySelectorAll("*"))]) {
    if (isContent(element, container, contentTestIds)) continue;
    for (const text of ownHangulStrings(element)) {
      findings.push({ where: describeElement(element), text });
    }
  }
  return findings;
}

/** 화면 어디에도 한글이 없어야 할 때 씁니다(콘텐츠 자리 없음). */
export function hangulIn(container: Element): readonly HangulFinding[] {
  return hangulOutside(container, []);
}
