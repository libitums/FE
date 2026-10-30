// 끝낸 에피소드 업데이트 안내의 기록 계약입니다 — 마지막으로 본 에피소드 버전과 「다시 보지 않기」. 기기 저장소에 둡니다.

/**
 * 안내의 기록. `versions`는 마지막으로 맞춘(안내를 닫았거나 띄울 것 없이 지도에 닿은) 때의 에피소드 id → 콘텐츠 버전 —
 * 아직 맞춘 적이 없으면 `null`(첫 실행 · 이 기능 전 앱에서 올라옴). `muted`는 「Don't show this again」.
 */
export type CatalogUpdateNoticeRecord = {
  readonly versions: Readonly<Record<string, string>> | null;
  readonly muted: boolean;
};
