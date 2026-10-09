// 접근성 클래스의 「생존」 판정 (작업 android-abi-minify, accessibility 단계 권고 R2).
//
// release-shrink.mjs의 mappingIssues는 이름이 바뀌면 class-renamed로 보고한다. 접근성 쪽에는 이름이 바뀌어도
// 살아 있는 클래스가 있다 (AccessibilityTapBridge$TapDelegate -> r2.a). 그래서 「이름 유지」가 아니라
// 「매핑에 있고 제거 표지가 아니다 + 멤버 이름(원래 이름 기준)이 블록에 있다」를 묻는 판정이 따로 필요하다.
// 구현(release-shrink.mjs)은 건드리지 않는다.
//
// 한계: 이 판정은 mapping.txt만 본다. 「R8이 실제로 지웠을 때」가 아니라 「매핑에 없거나 제거 표지일 때」 실패한다.
// 매핑과 dex는 같은 R8 실행의 산출물이라 둘은 어긋나지 않는다는 전제 위에 있다.

/**
 * @param {string} mappingText R8 mapping.txt
 * @param {{ className: string, members: string[] }[]} expected 원래 이름 기준 클래스와 멤버 메서드 이름
 * @returns {string[]} 정렬된 문제 목록 (`class-missing X` · `class-removed X -> R8$$REMOVED…` · `member-missing X.m`)
 */
export function survivalIssues(mappingText, expected) {
  /** @type {Map<string, { obfuscated: string, methods: Set<string> }>} */
  const classes = new Map();
  let current = null;
  for (const line of mappingText.split("\n")) {
    if (line.startsWith("#") || line.trim() === "") continue;
    if (!/^\s/.test(line)) {
      const match = /^(\S+) -> (\S+):\s*$/.exec(line);
      current = null;
      if (match !== null) {
        current = { obfuscated: match[2], methods: new Set() };
        classes.set(match[1], current);
      }
      continue;
    }
    if (current === null) continue;
    const split = line.lastIndexOf(" -> ");
    const paren = line.indexOf("(");
    if (split < 0 || paren < 0 || paren > split) continue;
    const name = line.slice(0, paren).trim().split(/\s+/).pop();
    if (name !== undefined && !name.includes(".")) current.methods.add(name);
  }

  const issues = [];
  for (const { className, members } of expected) {
    const entry = classes.get(className);
    if (entry === undefined) {
      issues.push(`class-missing ${className}`);
      continue;
    }
    if (entry.obfuscated.startsWith("R8$$REMOVED")) {
      issues.push(`class-removed ${className} -> ${entry.obfuscated}`);
      continue;
    }
    for (const member of members) {
      if (!entry.methods.has(member)) issues.push(`member-missing ${className}.${member}`);
    }
  }
  return issues.sort();
}
