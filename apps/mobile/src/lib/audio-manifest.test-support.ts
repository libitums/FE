// 음성 정보 파일 테스트 픽스처 - 실측 값(항목 16개)을 옮겨 적었습니다.

export const MEASURED_AUDIO: Readonly<
  Record<string, { duration_ms: number; speech_end_ms: number }>
> = {
  "u01-water/d-01": { duration_ms: 1091, speech_end_ms: 882 },
  "u01-water/d-02": { duration_ms: 1695, speech_end_ms: 1535 },
  "u01-water/d-03": { duration_ms: 1440, speech_end_ms: 1280 },
  "u01-water/d-04": { duration_ms: 1161, speech_end_ms: 978 },
  "u01-water/d-05": { duration_ms: 1207, speech_end_ms: 1046 },
  "u01-water/pre-3": { duration_ms: 2299, speech_end_ms: 1763 },
  "u02-checkin/d-01": { duration_ms: 2415, speech_end_ms: 2261 },
  "u02-checkin/post-1": { duration_ms: 6757, speech_end_ms: 6583 },
  "u02-checkin/pre-1": { duration_ms: 2027, speech_end_ms: 2027 },
  "u02-checkin/pre-3": { duration_ms: 3878, speech_end_ms: 3713 },
  "u03-mina/d-03": { duration_ms: 2933, speech_end_ms: 2933 },
  "u03-mina/d-09": { duration_ms: 3240, speech_end_ms: 3240 },
  "u03-mina/d-11": { duration_ms: 1474, speech_end_ms: 1474 },
  "u03-mina/post-1": { duration_ms: 2925, speech_end_ms: 2925 },
  "u03-mina/post-3": { duration_ms: 4075, speech_end_ms: 4075 },
  "u03-mina/pre-2": { duration_ms: 4894, speech_end_ms: 4894 },
};

/** 메인이 잰 정보 파일 그대로의 원문입니다. */
export const MEASURED_MANIFEST_TEXT: string = JSON.stringify({
  schema: "audio-manifest-1",
  generated_at: "2026-10-19T08:41:18Z",
  audio: MEASURED_AUDIO,
});

/** 표지 컷 3(「어서 오세요.」)을 맞추는 최소 파일입니다 - pre-3 `{2299, 1763}` 포함. */
export function manifestTextOf(
  audio: Record<string, unknown> = {
    "u01-water/pre-3": { duration_ms: 2299, speech_end_ms: 1763 },
    "u02-checkin/pre-1": { duration_ms: 2027, speech_end_ms: 2027 },
    "u01-water/d-01": { duration_ms: 1091 },
  },
  generatedAt = "2026-10-19T08:41:18Z",
): string {
  return JSON.stringify({ schema: "audio-manifest-1", generated_at: generatedAt, audio });
}

/** 서버가 없는 파일에 주는 실측 응답 본문(HTTP 400)입니다. */
export const ABSENT_BODY =
  '{"statusCode":"404","error":"not_found","message":"Object not found","code":"NoSuchKey"}';
