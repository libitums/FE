# 롤플레이 미션 화면 v2(스위치 뒤) — 02

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 스위치(`ROLEPLAY_MISSION_READY`)가 꺼져 있어 사용자 화면 · 렌더 경로는 바뀌지 않는다.
- 기능 PR: 롤플레이 미션 앱 화면 v2 — 계속하기 / 끝내기 · 채점 대기 판 · 교정 카드 둘 · 리포트 새 구역 · 서버 음성 흐름(포트 · 가짜), 문구 일곱 언어(ADR-0177, 파이프라인 문서 §10).
- 대상 commit: 이 보고서와 같은 브랜치 `feat/companion-mission-app-v2`의 HEAD(비교 기준은 서버 브랜치 끝 67a1b4d7, 그리고 앱 초안 v1을 그 위에 합친 c414d9ae)
- 기기: 측정 기기 없음(번들 크기만)
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build` 산출 `apps/mobile/dist/main.lynx.bundle`(`.env.local` 없음 — CI와 같은 설정)
- 측정 일시: 2026-11-23

## 시나리오

- 번들 크기: 같은 설정으로 세 커밋을 각각 빌드해 비교했다 — 앱 화면이 없는 서버 브랜치 끝, v1 초안을 합친 커밋, 이 변경.

## 이 변경이 무엇을 건드렸나

- 순수 함수: 판의 상태 기계(`mission-session.ts` · `mission-progress.ts`), 음성 규칙(`mission-voice.ts`), 가짜 출처 · 턴 · 규칙 · 기기.
- 화면: `MissionTalkScreen`을 `MissionTalkLine` · `MissionTalkCards`로 나눔, `MissionComposer` · `MissionTopBar` · `MissionReportScreen` 고침, `MissionReportExtras` 새로, CSS 하나(`roleplay-mission-voice.css`).
- 결선: `use-mission-voice.ts` 새로, `use-mission-session.ts` · `RoleplayMissionFlow.tsx` · `roleplay-mission-wiring.ts`(기기 음성 자리).
- 문구표: `roleplayMission.extra`(일곱 언어) 새로, 태국어 · 미얀마어 미션 문구 전체(v1에는 없었음). 이미지 · 음원 · 네이티브 · 모션은 바뀌지 않았다.

## 분석 결과

| 번들 | 크기 |
| --- | ---: |
| 서버 브랜치 끝 67a1b4d7(앱 화면 없음) — CI 설정 | 5,492,459 bytes |
| v1 초안을 합친 c414d9ae — CI 설정 | 5,611,311 bytes(+118,852) |
| 이 변경 — CI 설정 | 5,673,504 bytes(서버 대비 +181,045, v1 대비 +62,193) |
| 천장(`budget.json`, ADR-0149) | 5,850,000 bytes — 넘지 않는다(남는 폭 176,496 bytes) |

## 제한 사항

- 번들만 쟀고 렌더는 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- 스위치가 꺼져 있어도 코드는 번들에 든다(길만 없다). 늘어난 몫의 큰 쪽은 문구(새 칸 일곱 언어 + 태국어 · 미얀마어 미션 문구 전체)와 가짜 출처 · 기기 · fixture다.

## 결론과 후속

- 줄일 자리(보고만, 이번에 하지 않음): ① 미션 route 전체를 지연 적재(스위치가 꺼져 있으면 아예 받지 않음), ② 가짜 출처 · 가짜 기기 · fixture를 개발 빌드에만, ③ 미션 문구를 언어별 지연 적재. 서버 출처를 붙이기 전에 본다.
- 렌더 · 메모리 캡처는 서버 출처 · 호스트 음성 모듈을 붙여 스위치를 켤 때 한다.
