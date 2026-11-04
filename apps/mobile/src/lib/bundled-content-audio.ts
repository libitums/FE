// 앱에 실은 콘텐츠 음성의 표입니다 — 버킷 상대 경로(`audio/<id>.m4a`) → 호스트 번들 음성 이름. 내장 튜토리얼이 쓰는 음성만
// 싣습니다: 첫 실행이 오프라인 · 모바일 데이터여도 튜토리얼이 소리까지 그대로 돕니다. 파일은 `apps/ios/Host/audio/`에 있고
// Android는 같은 폴더를 복사합니다(ADR-0045). 호스트는 `/` 없는 이름 하나만 받아 `/`를 `-`로 잇습니다.

export const bundledContentAudioIds: readonly string[] = [
  "level-3/u00-tutorial/d-01-r2",
  "level-3/u00-tutorial/d-02-r2",
  "level-3/u00-tutorial/d-03-r2",
  "level-3/u00-tutorial/d-04-v2",
  "level-3/u00-tutorial/d-05-r2",
  "level-3/u00-tutorial/d-06-r2",
  "level-3/u00-tutorial/post-1-r2",
  "level-3/u00-tutorial/post-2-r2",
  "level-3/u00-tutorial/pre-5-dream-r2",
  "level-3/u00-tutorial/rp-01-reask-v2",
  "level-3/u00-tutorial/s1-01-ex",
  "level-3/u00-tutorial/s1-01-word-r2",
  "level-3/u00-tutorial/s1-03-ex",
  "level-3/u00-tutorial/s1-03-word",
];

const bundled = new Set(bundledContentAudioIds);
const AUDIO_PATH = /^audio\/(.+)\.m4a$/;

/** 표에 있으면 호스트 번들 음성 이름, 없으면 null입니다. 순수 · 던지지 않음. */
export function bundledContentAudioSource(relativePath: string): string | null {
  const id = AUDIO_PATH.exec(relativePath)?.[1];
  return id !== undefined && bundled.has(id) ? id.replaceAll("/", "-") : null;
}
