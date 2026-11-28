// 롤플레이 미션의 스위치입니다(메신저 `MESSENGER_MEDIA_READY`와 같은 방식). 꺼져 있으면 롤플레이 목록에 미션 항목이 없고
// 미션 route로 가는 길이 없습니다 — 지금 앱의 화면 · 이벤트가 그대로입니다. 서버 조각이 운영에 오르기 전까지(PRD §0.9) 끕니다.
// 테스트와 개발 미리보기는 `setRoleplayMissionForTest`(app/roleplay-mission-wiring.ts)로만 켭니다.
export const ROLEPLAY_MISSION_READY = false;
