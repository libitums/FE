// 끝낸 에피소드 업데이트 안내의 기록 계약입니다 — 본 상태의 서명과 「다시 보지 않기」. 기기 저장소에 둡니다.

/** 닫은 안내의 기록. `seen`은 닫을 때 바뀌어 있던 상태의 서명, `muted`는 「Don't show this again」. */
export type CatalogUpdateNoticeRecord = {
  readonly seen: readonly string[];
  readonly muted: boolean;
};
