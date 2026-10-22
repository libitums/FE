import "background-only";

// 와이어(delivery-2 JSON) → 도메인 `Episode` 디코더의 앱 쪽 입구입니다. 몸은
// `@libitums/episode-core/episode`에 있고(랜딩 체험판과 공유), 이 모듈은 다시 내보내기만 합니다.
// 첫 줄의 `background-only`가 메인 스레드 import를 빌드 오류로 막아 zod가 메인 스레드 번들에
// 실리지 않습니다.
export { decodeEpisode, KNOWN_ITEM_TYPES } from "@libitums/episode-core/episode";
export type * from "./episode-content.model";
