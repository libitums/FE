// 앱 실행마다 나가는 공개 콘텐츠 버킷 요청(manifest 갱신)은 인증 · 푸시 등을 세는 전송 단언의 대상이 아닙니다.
const contentBucketPath = "/storage/v1/object/public/content/";

export function isContentRequest(url: string): boolean {
  return url.includes(contentBucketPath);
}

// 콘텐츠 요청에 주는 가짜 응답입니다 — 갱신은 실패로 끝나고 앱은 번들 콘텐츠를 그대로 씁니다.
export function contentNotFoundResponse(): { status: number; text: () => Promise<string> } {
  return { status: 404, text: async () => "" };
}

// `vi.fn` 스파이의 기록에서 콘텐츠 버킷이 아닌 호출만 남깁니다(첫 인자가 URL).
export function nonContentCalls(spy: {
  mock: { calls: readonly (readonly unknown[])[] };
}): (readonly unknown[])[] {
  return spy.mock.calls.filter(
    (call) => !(typeof call[0] === "string" && isContentRequest(call[0])),
  );
}
