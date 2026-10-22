// 콘텐츠 음성 id를 재생 주소로 바꾸는 순수 함수입니다 — 정본은 `@libitums/episode-core/content-url`이고
// 두 스레드에 실려도 됩니다(패키지의 이 모듈은 import가 없습니다).
export {
  CONTENT_AUDIO_DIR,
  contentAudioPathOf,
  contentAudioSourceOf,
  hasContentPlaceholder,
} from "@libitums/episode-core/content-url";
