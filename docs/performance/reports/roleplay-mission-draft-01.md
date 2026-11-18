# 롤플레이 미션 화면 초안(스위치 뒤) — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 스위치(`ROLEPLAY_MISSION_READY`)가 꺼져 있어 사용자 화면 · 렌더 경로는 바뀌지 않는다 — 롤플레이 목록의 구획 계산에 `useRoleplayMissions()`(꺼져 있으면 상태 · 효과 없음)가 한 번 더 돌 뿐이다.
- 기능 PR: 롤플레이 미션 화면 초안 — 미리보기 · 대화 · 리포트, `MissionSource` 포트와 가짜 출처, 목록의 미션 항목(ADR-0160 · PRD §4 · §8 N3).
- 대상 commit: 이 보고서와 같은 브랜치 `feat/companion-mission-app`의 HEAD(비교 기준은 그 바탕 `feat/companion-mission-core` c971a102)
- 기기: 측정 기기 없음(번들 크기만)
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build` 산출 `apps/mobile/dist/main.lynx.bundle`(`.env.local` 없음 — CI와 같은 설정)
- 측정 일시: 2026-11-19

## 시나리오

- 번들 크기: 같은 설정으로 바탕 c971a102와 이 변경을 각각 빌드해 비교했다.

## 이 변경이 무엇을 건드렸나

- 순수 함수: 판의 상태 기계(`screens/roleplay-mission/mission-session.ts`), 표시 규칙(`mission-model.ts`), 가짜 출처 · 규칙 · fixture.
- 화면: `MissionPreviewScreen` · `MissionTalkScreen` · `MissionTopBar` · `MissionComposer` · `MissionReportScreen`과 CSS 셋. 말풍선 · 입력 중 · 교정 카드 · 보내지 못한 글은 메신저 부품을 다시 쓴다.
- 결선: `app/roleplay-mission-wiring.ts` · `RoleplayMissionFlow.tsx` · `render-roleplay-mission.tsx`, 롤플레이 구획(`roleplay-sections.ts`) · 카드 둘째 줄 · route 하나.
- 문구표 `roleplayMission`(다섯 언어). 의존성: 계약 패키지를 `devDependencies`로(타입만 — 런타임 import 없음, zod가 번들에 들지 않는다). 이미지 · 음원 · 네이티브 · 모션은 바뀌지 않았다.

## 분석 결과

| 번들 | 크기 |
| --- | ---: |
| 바탕 c971a102 — CI 설정 | 5,050,914 bytes |
| 이 변경 — CI 설정 | 5,173,176 bytes |
| 차이 | +122,262 bytes |
| 천장(`budget.json`, ADR-0149) | 5,327,000 bytes — 넘지 않는다(남는 폭 153,824 bytes) |

## 제한 사항

- 번들만 쟀고 렌더는 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- 스위치가 꺼져 있어도 코드는 번들에 든다(길만 없다). 천장 남는 폭의 약 44%를 쓴다 — 서버 출처를 붙이기 전에 줄일 자리(가짜 출처 · fixture를 개발 빌드에만 두기, 번역 초안 넷의 지연 적재)는 화면 스펙 §9에 적었다.

## 결론과 후속

- 스위치를 켠 개발 빌드에서 [e2e](../../e2e/roleplay-mission.md) RM1 ~ RM15로 화면 · 말하기 · 화면 맞춤을 확인한다. 렌더 · 메모리 캡처는 서버 출처를 붙여 스위치를 켤 때 한다.
