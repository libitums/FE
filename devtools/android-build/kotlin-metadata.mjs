// Gradle 출력에서 Kotlin metadata 판 불일치 줄을 찾는 순수 판정입니다.
//
// 이 앱은 Kotlin을 컴파일하지 않지만, lintVital*이 의존 jar의 Kotlin metadata를 읽습니다. lint가 싣는 Kotlin이
// 의존보다 두 판 이상 낮으면 `e: … Module was compiled with an incompatible version of Kotlin` 줄을 내고도
// 빌드는 성공합니다. CI가 그 줄을 놓치지 않게 여기서 실패로 바꿉니다.

const MISMATCH = "Module was compiled with an incompatible version of Kotlin";

/**
 * @param {string} log Gradle 출력 전체
 * @returns {string[]} 불일치를 알린 `e:` 줄들(입력 순서)
 */
export function findKotlinMetadataErrors(log) {
  return log.split(/\r?\n/).filter((line) => line.startsWith("e: ") && line.includes(MISMATCH));
}
