// 롤플레이 미션 코드를 번들에 싣는가 — `lynx.config.ts`의 `defineDCE`가 빌드 시점에 글자로 바꿔 넣습니다(dev 빌드이거나 스위치가
// 켜졌을 때 true). 테스트는 `vitest.config.ts`의 `define`이 true로 둡니다(ADR-0193).
declare const __ROLEPLAY_MISSION_IN_BUNDLE__: boolean;
