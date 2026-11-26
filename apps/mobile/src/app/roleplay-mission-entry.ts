// 롤플레이 미션의 **번들 입구**입니다 — 늘 번들에 드는 파일(`render-screen.tsx` · `roleplay-sections.ts`)이 미션 코드에 닿는 길은
// 이 파일 하나뿐입니다(`roleplay-mission-entry.unit.test.ts` ME-S1).
//
// 스위치가 꺼진 release 번들에서 미션 코드가 통째로 빠지는 길은 탐침 화면(`render-dev-probe.tsx`, ADR-0171)과 같습니다. 부르는 쪽은
// `__ROLEPLAY_MISSION_IN_BUNDLE__ ? …entry… : null`로만 부르고(`lynx.config.ts`의 `defineDCE` — dev이거나 스위치가 켜졌을 때
// true), `lynx.config.ts`가 이 파일을 부수 효과 없는 모듈로 표시해 쓰이지 않는 import가 미션 화면 · 문구 · CSS · 가짜를
// 끌고 들어오지 않습니다(ADR-0177, 번들 천장 ADR-0149). 이 파일에 모듈 최상위 부수 효과를 두지 않습니다 — 표시가 거짓이 됩니다.
// 지연 적재(lazy bundle)를 쓰지 않은 까닭은 이 저장소에 그 선례가 없고 호스트가 추가 번들을 받는 길이 필요해서입니다(성능 보고서 04).

export { renderRoleplayMission } from "./render-roleplay-mission";
export { useRoleplayMissions } from "./roleplay-mission-wiring";
