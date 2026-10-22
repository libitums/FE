// 콘텐츠 음성 id를 재생 주소로 바꾸는 순수 함수입니다 - 두 스레드에 실려도 되도록 import가 없습니다.

/** 버킷 안 음성 폴더(기준 상대). */
export const CONTENT_AUDIO_DIR = "audio/";

// 소문자 · 숫자 · 하이픈 조각을 `/`로 잇습니다. `.` · `:` · 대문자 · 공백이 없어 URL 인코딩이 필요 없습니다.
const AUDIO_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
const PLACEHOLDER = /\{[^{}]+\}/;

/** 규약에 맞는 id만 `audio/<id>.m4a`입니다. 규약 밖이면 `null`입니다. */
export function contentAudioPathOf(audioId: string): string | null {
  return AUDIO_ID.test(audioId) ? `${CONTENT_AUDIO_DIR}${audioId}.m4a` : null;
}

/** 콘텐츠 자리표시자(`{…}`, 중괄호 안이 비어 있지 않음)가 있는가. */
export function hasContentPlaceholder(text: string): boolean {
  return PLACEHOLDER.test(text);
}

/**
 * 재생할 전체 주소입니다. id가 없거나 자리표시자가 든 줄이거나 규약 밖이면
 * `contentUrlOf`를 부르지 않고 `null`입니다.
 */
export function contentAudioSourceOf(
  audioId: string | undefined,
  spokenKo: string,
  contentUrlOf: (relativePath: string) => string | null,
): string | null {
  if (audioId === undefined || audioId === "") return null;
  if (hasContentPlaceholder(spokenKo)) return null;
  const path = contentAudioPathOf(audioId);
  return path === null ? null : contentUrlOf(path);
}
