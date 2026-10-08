// 정본은 android-release-config 계약 6.2절. 순수 함수 — 파일을 읽지 않는다.
const NEEDLE = "com.libitum.host";
// 클래스 완전한 이름(대문자로 시작하는 식별자) 또는 계약된 동작 문자열은 낡은 참조가 아니다.
const ALLOWED_AFTER =
  /^(?:\.[A-Z][\w$]*|\.test\.(?:STOP_SIGNED_IN_FIXTURE|POST_PUSH_FIXTURE)(?![\w$]))/;

/**
 * Android 실행 표면의 낡은 패키지 참조. 1부터 센 줄 · 열.
 * @param {string} text
 * @returns {Array<{ line: number, column: number, text: string }>}
 */
export function staleAndroidPackageReferences(text) {
  const found = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const trimmed = raw.trim();
    let at = raw.indexOf(NEEDLE);
    while (at !== -1) {
      if (!ALLOWED_AFTER.test(raw.slice(at + NEEDLE.length))) {
        found.push({ line: index + 1, column: at + 1, text: trimmed });
      }
      at = raw.indexOf(NEEDLE, at + 1);
    }
  });
  return found;
}
