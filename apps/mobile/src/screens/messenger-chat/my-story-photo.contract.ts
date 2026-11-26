// 내 스토리 사진(ADR-0199 · 서버 ADR-0191 D11)의 앱 쪽 모양입니다. 타입만 둡니다.
// 사진은 호스트(`StoryPhotoModule`)가 고르고 · 찍고 · 줄여(긴 변 1600px · JPEG 0.8 · EXIF 없음) 기기 캐시에 둡니다. 올리기는 비공개 버킷
// `my-story-photos/<user_id>/<파일>`에 먼저 올린 뒤 `companion-my-story` post로 그 경로를 보냅니다 — 서버가 요청 안에서 사진을 읽어
// 게시(live) · 다시 보기(checking — 나에게만) · 거절을 정합니다.

import type { MyStoryOverlay, MyStoryPostResult } from "./my-stories.contract";

export type StoryPhotoSource = "camera" | "library";

/** 기기에서 줄인 사진 한 장 — `url`은 `<image>`에 그대로 쓰는 `file://` 주소, `path`는 호스트가 올릴 때 받는 절대 경로. */
export type PickedPhoto = {
  readonly url: string;
  readonly path: string;
  readonly width: number;
  readonly height: number;
};

/** 고르기 결과 — `denied`: 카메라 권한 거부(다시 묻지 않음), `unavailable`: 카메라 없음(시뮬레이터 등). */
export type PhotoPickResult =
  | { readonly status: "picked"; readonly photo: PickedPhoto }
  | { readonly status: "cancelled" | "denied" | "unavailable" | "failed" };

/** 사진 스토리 올리기 — `clientId`가 같으면 서버가 한 번만 올립니다. `ko`는 1 ~ 120자(서버 판정). */
export type MyPhotoStoryDraft = {
  readonly clientId: string;
  readonly photo: PickedPhoto;
  /** 올린 사람이 붙인 한국어 한 줄 — 글 상자 글, 없으면 첫 단어(`photoLineOf`). */
  readonly ko: string;
  readonly overlays: readonly MyStoryOverlay[];
  readonly lang: string;
  readonly tzOffsetMin: number;
  /** 기기 지역(ISO 3166-1 alpha-2) — 위기 신호일 때 서버가 그 지역 상담 연락처를 고릅니다. 모르면 null. */
  readonly region: string | null;
};

/** 거절된 사진 — `id`로 「다시 확인 요청」(`companion_request_story_review`). `category`는 서버 분류(화면에 그대로 쓰지 않음). */
export type MyStoryRejection = { readonly id: string; readonly category: string };

/** 사진 포트(목록 화면이 씀) — 호스트 모듈이 없으면 포트 자체가 없습니다. 어떤 호출도 던지지 않습니다. */
export type MyStoryPhotoPort = {
  readonly pick: (source: StoryPhotoSource) => Promise<PhotoPickResult>;
  /** 업로드 → 게시. 업로드가 실패하면 `upload_failed`. `onUploaded`는 사진이 올라간 뒤 게시(서버 확인) 전에 한 번. */
  readonly post: (draft: MyPhotoStoryDraft, onUploaded?: () => void) => Promise<MyStoryPostResult>;
  /** 내 사진의 서명 주소(한 시간) — 못 만들면 null. */
  readonly url: (imagePath: string) => Promise<string | null>;
  readonly requestReview: (rejectionId: string) => Promise<boolean>;
  /** 편집을 닫음 — 기기 캐시의 그 파일을 지웁니다. */
  readonly discard: (path: string) => void;
};

/** 서버 원격의 사진 부분(`CompanionMyStoriesRemote.photo`) — 업로드는 결선이 넘긴 호스트 업로드로 합니다. */
export type CompanionMyStoryPhotoRemote = {
  readonly post: (draft: MyPhotoStoryDraft, onUploaded?: () => void) => Promise<MyStoryPostResult>;
  readonly sign: (imagePath: string) => Promise<string | null>;
  readonly requestReview: (rejectionId: string) => Promise<boolean>;
};

/** 호스트 업로드 — 파일 바이트를 그대로 POST. 결과는 `photoUploadOf`가 가릅니다. */
export type StoryPhotoUpload = (
  path: string,
  url: string,
  headers: Readonly<Record<string, string>>,
) => Promise<"uploaded" | "failed">;
