// @libitums/episode-core/content-url — 콘텐츠 버킷 주소 · 음성 주소 · 상대 아바타 경로.

export {
  CONTENT_BUCKET,
  CONTENT_BUCKET_PATH,
  contentBaseUrl,
  resolveContentUrlSafe,
} from "./content-url";
export {
  CONTENT_AUDIO_DIR,
  contentAudioPathOf,
  contentAudioSourceOf,
  hasContentPlaceholder,
} from "./content-audio";
export { counterpartAvatarPathOf, type CounterpartAvatarDecode } from "./content-avatar";
